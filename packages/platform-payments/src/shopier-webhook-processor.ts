import { timingSafeEqual } from "node:crypto";
import { Prisma, prisma, type PaymentOrder, type PaymentWebhookEvent } from "@hushle/platform-db";
import { buildShopierBuyerEmailHmac } from "./adapters/shopier-webhook";
import { fulfillPaidPaymentOrder, PaymentFulfillmentError } from "./fulfillment";
import { createPaymentFulfillmentNotification, invalidatePaymentFulfillmentCaches } from "./fulfillment-effects";
import { assertPaymentOrderTransition } from "./order-state-machine";
import { PaymentWebhookProcessingError } from "./webhook-inbox";

type Metadata = { productId: string; productTitle: string; buyerEmailHmac: string };

function failure(code: string, retryable = false): PaymentWebhookProcessingError {
    return new PaymentWebhookProcessingError(code, retryable);
}

function readMetadata(event: PaymentWebhookEvent): Metadata {
    const value = event.metadata;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw failure("shopier_metadata_missing");
    const metadata = value as Record<string, unknown>;
    if (
        typeof metadata.productId !== "string" || !/^\d{1,64}$/.test(metadata.productId)
        || typeof metadata.productTitle !== "string" || metadata.productTitle.length > 240
        || typeof metadata.buyerEmailHmac !== "string" || !/^[a-f0-9]{64}$/.test(metadata.buyerEmailHmac)
    ) throw failure("shopier_metadata_invalid");
    return metadata as Metadata;
}

function hashesMatch(left: string, right: string): boolean {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
}

async function lockByProduct(tx: Prisma.TransactionClient, productId: string): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM payment_orders
        WHERE provider = 'shopier_v2' AND provider_session_reference = ${productId}
        FOR UPDATE
    `);
    if (rows.length !== 1) throw failure("shopier_order_not_found");
    return rows[0].id;
}

async function applyOutcome(event: PaymentWebhookEvent, webhookToken: string, now: Date): Promise<{
    action: "fulfill" | "duplicate" | "review";
    order: PaymentOrder;
}> {
    if (event.provider !== "shopier_v2" || event.outcome !== "payment_succeeded") {
        throw failure("shopier_outcome_not_supported");
    }
    if (!event.providerOrderReference || !event.providerPaymentReference) {
        throw failure("shopier_reference_missing");
    }
    if (event.amountMinor === null || !event.currency) throw failure("shopier_amount_missing");
    const amountMinor = event.amountMinor;
    const currency = event.currency;
    const providerOrderReference = event.providerOrderReference;
    const providerPaymentReference = event.providerPaymentReference;
    const metadata = readMetadata(event);
    return prisma.$transaction(async (tx) => {
        const orderId = await lockByProduct(tx, metadata.productId);
        const order = await tx.paymentOrder.findUniqueOrThrow({
            where: { id: orderId }, include: { user: { select: { email: true, normalizedEmail: true } } },
        });
        await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { orderId } });
        if (
            amountMinor !== order.totalAmountMinor
            || currency.toUpperCase() !== order.currency.toUpperCase()
            || metadata.productTitle !== `${order.productNameSnapshot} [${order.id.slice(0, 8)}]`
        ) throw failure("shopier_order_proof_mismatch");
        const occurredAt = event.occurredAt ?? now;
        if (
            occurredAt.getTime() < order.createdAt.getTime() - 5 * 60_000
            || occurredAt.getTime() > now.getTime() + 5 * 60_000
        ) throw failure("shopier_event_time_mismatch");
        const email = order.user.normalizedEmail ?? order.user.email?.trim().toLowerCase();
        const emailMatches = Boolean(email && hashesMatch(
            metadata.buyerEmailHmac,
            buildShopierBuyerEmailHmac(email, webhookToken)
        ));
        if (!emailMatches) {
            await tx.paymentReconciliationCase.upsert({
                where: { orderId },
                create: {
                    orderId,
                    reasonCode: "shopier_buyer_email_mismatch",
                    lastErrorCode: "manual_review_required",
                    nextCheckAt: null,
                },
                update: {
                    status: "open",
                    reasonCode: "shopier_buyer_email_mismatch",
                    lastErrorCode: "manual_review_required",
                    nextCheckAt: null,
                },
            });
            return { action: "review", order };
        }
        if (order.status === "paid" || order.status === "fulfilled") return { action: "duplicate", order };
        if (order.status !== "awaiting_payment") throw failure("shopier_order_state_conflict", true);
        assertPaymentOrderTransition(order.status, "paid");
        const existingProof = await tx.paymentCheckoutVerification.findUnique({ where: { orderId } });
        if (existingProof) throw failure("shopier_verification_conflict");
        await tx.paymentCheckoutVerification.create({
            data: {
                orderId,
                provider: "shopier_v2",
                providerPaymentReference,
                amountMinor: order.totalAmountMinor,
                paidAmountMinor: amountMinor,
                currency,
                providerPaymentStatus: "paid",
                verifiedAt: occurredAt,
            },
        });
        const paid = await tx.paymentOrder.update({
            where: { id: orderId },
            data: {
                status: "paid",
                providerOrderReference,
                paidAt: occurredAt,
                providerHostedUrl: null,
                version: { increment: 1 },
            },
        });
        return { action: "fulfill", order: paid };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

export async function processShopierPaymentWebhook(
    event: PaymentWebhookEvent,
    input: { webhookToken: string; now?: Date }
): Promise<"processed" | "ignored"> {
    if (event.outcome === "ignored") return "ignored";
    const now = input.now ?? new Date();
    const result = await applyOutcome(event, input.webhookToken, now);
    if (result.action === "review") return "ignored";
    try {
        await fulfillPaidPaymentOrder({ orderId: result.order.id, now });
        const userId = await createPaymentFulfillmentNotification(result.order.id, now, "shopier_v2");
        await invalidatePaymentFulfillmentCaches(userId).catch(() => undefined);
        return "processed";
    } catch (error) {
        if (error instanceof PaymentFulfillmentError) {
            throw failure(`fulfillment_${error.code}`, error.retryable);
        }
        throw failure("fulfillment_internal_error", true);
    }
}
