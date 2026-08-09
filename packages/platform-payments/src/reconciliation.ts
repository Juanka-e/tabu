import { Prisma, prisma, type PaymentOrder } from "@hushle/platform-db";
import {
    PaytrAdapterError,
    queryPaytrPaymentStatus,
    type PaytrCredentials,
    type PaytrStatusQueryResult,
} from "./adapters/paytr";
import { fulfillPaidPaymentOrder } from "./fulfillment";
import { assertPaymentOrderTransition } from "./order-state-machine";
import {
    createPaymentFulfillmentNotification,
    invalidatePaymentFulfillmentCaches,
} from "./fulfillment-effects";

export interface PaymentReconciliationConfig {
    batchSize: number;
    minAgeMinutes: number;
    retryDelayMinutes: number;
    maxAttempts: number;
}

export type PaytrStatusQuery = (input: {
    merchantOrderId: string;
    credentials: PaytrCredentials;
}) => Promise<PaytrStatusQueryResult>;

function credentialsFromEnvironment(
    environment: Readonly<Record<string, string | undefined>>
): PaytrCredentials {
    return {
        merchantId: environment.PAYTR_MERCHANT_ID ?? "",
        merchantKey: environment.PAYTR_MERCHANT_KEY ?? "",
        merchantSalt: environment.PAYTR_MERCHANT_SALT ?? "",
    };
}

async function upsertCase(input: {
    orderId: string;
    reasonCode: string;
    snapshot?: Prisma.InputJsonValue;
    errorCode?: string;
    now: Date;
    retryDelayMinutes: number;
}): Promise<void> {
    const nextCheckAt = new Date(input.now.getTime() + input.retryDelayMinutes * 60_000);
    await prisma.paymentReconciliationCase.upsert({
        where: { orderId: input.orderId },
        create: {
            orderId: input.orderId,
            status: "open",
            reasonCode: input.reasonCode,
            attemptCount: 1,
            providerSnapshot: input.snapshot,
            lastErrorCode: input.errorCode,
            lastCheckedAt: input.now,
            nextCheckAt,
        },
        update: {
            status: "open",
            reasonCode: input.reasonCode,
            attemptCount: { increment: 1 },
            providerSnapshot: input.snapshot,
            lastErrorCode: input.errorCode,
            lastCheckedAt: input.now,
            nextCheckAt,
            resolvedAt: null,
            resolvedByUserId: null,
            resolutionNote: null,
        },
    });
}

async function markPaid(order: PaymentOrder, now: Date): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
            SELECT id FROM payment_orders WHERE id = ${order.id} FOR UPDATE
        `);
        if (rows.length !== 1) return false;
        const current = await tx.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
        if (current.status === "paid" || current.status === "fulfilled") return false;
        if (current.status !== "awaiting_payment") return false;
        assertPaymentOrderTransition(current.status, "paid");
        await tx.paymentOrder.update({
            where: { id: current.id },
            data: {
                status: "paid",
                paidAt: now,
                providerSessionReference: null,
                providerHostedUrl: null,
                version: { increment: 1 },
            },
        });
        await tx.paymentReconciliationCase.upsert({
            where: { orderId: current.id },
            create: {
                orderId: current.id,
                status: "resolved",
                reasonCode: "provider_paid",
                attemptCount: 1,
                lastCheckedAt: now,
                resolvedAt: now,
                resolutionNote: "provider_status_confirmed_paid",
            },
            update: {
                status: "resolved",
                reasonCode: "provider_paid",
                attemptCount: { increment: 1 },
                lastErrorCode: null,
                lastCheckedAt: now,
                nextCheckAt: null,
                resolvedAt: now,
                resolutionNote: "provider_status_confirmed_paid",
            },
        });
        return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

async function resolveCase(orderId: string, now: Date, note: string): Promise<void> {
    await prisma.paymentReconciliationCase.upsert({
        where: { orderId },
        create: {
            orderId,
            status: "resolved",
            reasonCode: "provider_paid",
            attemptCount: 1,
            lastCheckedAt: now,
            resolvedAt: now,
            resolutionNote: note,
        },
        update: {
            status: "resolved",
            reasonCode: "provider_paid",
            attemptCount: { increment: 1 },
            lastErrorCode: null,
            lastCheckedAt: now,
            nextCheckAt: null,
            resolvedAt: now,
            resolutionNote: note,
        },
    });
}

async function finishVerifiedOrder(order: PaymentOrder, now: Date): Promise<"fulfilled" | "unchanged"> {
    if (order.status === "paid") {
        await fulfillPaidPaymentOrder({ orderId: order.id, now });
    } else if (order.status !== "fulfilled") {
        return "unchanged";
    }
    const userId = await createPaymentFulfillmentNotification(order.id, now, "paytr");
    await invalidatePaymentFulfillmentCaches(userId);
    await resolveCase(order.id, now, "fulfillment_and_notification_completed");
    return "fulfilled";
}

function snapshot(result: Extract<PaytrStatusQueryResult, { status: "success" }>) {
    return {
        schemaVersion: 1,
        paymentAmountMinor: result.paymentAmountMinor,
        paymentTotalMinor: result.paymentTotalMinor,
        currency: result.currency,
        testMode: result.testMode,
        returnCount: result.returnCount,
    } satisfies Prisma.InputJsonValue;
}

export async function reconcilePaytrOrder(input: {
    order: PaymentOrder;
    credentials: PaytrCredentials;
    query?: PaytrStatusQuery;
    now: Date;
    retryDelayMinutes: number;
}): Promise<"fulfilled" | "review" | "unchanged"> {
    if (input.order.status === "paid" || input.order.status === "fulfilled") {
        return finishVerifiedOrder(input.order, input.now);
    }
    const reference = input.order.providerOrderReference;
    if (!reference) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "provider_reference_missing",
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }

    let result: PaytrStatusQueryResult;
    try {
        result = await (input.query ?? queryPaytrPaymentStatus)({
            merchantOrderId: reference,
            credentials: input.credentials,
        });
    } catch (error) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "provider_query_failed",
            errorCode: error instanceof PaytrAdapterError ? error.code : "provider_unavailable",
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }

    if (result.status === "error") {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "provider_order_not_confirmed",
            errorCode: result.errorCode,
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }
    const providerSnapshot = snapshot(result);
    const mismatch = result.paymentAmountMinor !== input.order.totalAmountMinor
        || result.currency !== input.order.currency.toUpperCase()
        || result.testMode !== true;
    if (mismatch || result.returnCount > 0) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: result.returnCount > 0 ? "provider_return_detected" : "provider_payment_mismatch",
            snapshot: providerSnapshot,
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }

    const transitioned = await markPaid(input.order, input.now);
    if (!transitioned) return "unchanged";
    return finishVerifiedOrder({ ...input.order, status: "paid", paidAt: input.now }, input.now);
}

export async function runPaymentReconciliation(input: {
    config: PaymentReconciliationConfig;
    dryRun: boolean;
    environment?: Readonly<Record<string, string | undefined>>;
    query?: PaytrStatusQuery;
    now?: Date;
}) {
    const now = input.now ?? new Date();
    const cutoff = new Date(now.getTime() - input.config.minAgeMinutes * 60_000);
    const orders = await prisma.paymentOrder.findMany({
        where: {
            provider: "paytr",
            createdAt: { lte: cutoff },
            OR: [
                {
                    status: { in: ["awaiting_payment", "paid"] },
                    OR: [
                        { reconciliationCase: null },
                        { reconciliationCase: { status: "open", attemptCount: { lt: input.config.maxAttempts }, nextCheckAt: { lte: now } } },
                    ],
                },
                {
                    status: "fulfilled",
                    fulfillment: { notificationSentAt: null },
                    OR: [
                        { reconciliationCase: null },
                        { reconciliationCase: { status: "open", attemptCount: { lt: input.config.maxAttempts }, nextCheckAt: { lte: now } } },
                    ],
                },
            ],
        },
        orderBy: { createdAt: "asc" },
        take: input.config.batchSize,
    });
    if (input.dryRun) return { dryRun: true, candidateCount: orders.length };

    const credentials = credentialsFromEnvironment(input.environment ?? process.env);
    let fulfilled = 0;
    let review = 0;
    let unchanged = 0;
    for (const order of orders) {
        try {
            const outcome = await reconcilePaytrOrder({
                order,
                credentials,
                query: input.query,
                now,
                retryDelayMinutes: input.config.retryDelayMinutes,
            });
            if (outcome === "fulfilled") fulfilled += 1;
            else if (outcome === "review") review += 1;
            else unchanged += 1;
        } catch (error) {
            await upsertCase({
                orderId: order.id,
                reasonCode: "local_completion_failed",
                errorCode: error instanceof Error ? error.name.slice(0, 80) : "unknown_error",
                now,
                retryDelayMinutes: input.config.retryDelayMinutes,
            });
            review += 1;
        }
    }
    return { dryRun: false, candidateCount: orders.length, fulfilled, review, unchanged };
}
