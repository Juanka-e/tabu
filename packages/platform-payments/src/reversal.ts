import { getRedisKey, invalidateJsonCache } from "@hushle/platform-cache";
import { Prisma, prisma } from "@hushle/platform-db";
import { z } from "zod";
import { assertPaymentOrderTransition } from "./order-state-machine";

const reversalInputSchema = z.object({
    orderId: z.string().uuid(),
    outcome: z.enum(["refund", "chargeback"]),
    externalReference: z.string().trim().min(3).max(191),
    reason: z.string().trim().min(3).max(500),
    requestedByUserId: z.number().int().positive().optional(),
    now: z.date().optional(),
});

const grantResultSchema = z.discriminatedUnion("kind", [
    z.object({
        schemaVersion: z.literal(1),
        kind: z.literal("coin_pack"),
        coinAmount: z.number().int().positive(),
        ledgerEntryId: z.number().int().positive(),
        balanceAfter: z.number().int().min(0),
    }),
    z.object({
        schemaVersion: z.literal(1),
        kind: z.enum(["cosmetic_item", "cosmetic_bundle"]),
        shopItemIds: z.array(z.number().int().positive()).min(1).max(100),
        inventoryItemIds: z.array(z.number().int().positive()).min(1).max(100),
    }).refine((value) => value.shopItemIds.length === value.inventoryItemIds.length),
]);

export type PaymentReversalResult = {
    orderId: string;
    reversalId: string;
    duplicate: boolean;
    status: "completed" | "manual_review";
    outcome: "refund" | "chargeback";
    removedInventoryItemIds: number[];
};

export class PaymentReversalError extends Error {
    constructor(public readonly code:
        | "invalid_input"
        | "order_not_found"
        | "order_not_reversible"
        | "fulfillment_not_completed"
        | "grant_evidence_invalid"
        | "reversal_identity_conflict"
        | "reversal_state_conflict"
    ) {
        super(code);
        this.name = "PaymentReversalError";
    }
}

async function lockOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM payment_orders WHERE id = ${orderId} FOR UPDATE
    `);
    if (rows.length !== 1) throw new PaymentReversalError("order_not_found");
}

function readGrantResult(value: Prisma.JsonValue | null) {
    const parsed = grantResultSchema.safeParse(value);
    if (!parsed.success) throw new PaymentReversalError("grant_evidence_invalid");
    return parsed.data;
}

export async function reverseExternallyConfirmedPayment(
    input: z.input<typeof reversalInputSchema>
): Promise<PaymentReversalResult> {
    const parsed = reversalInputSchema.safeParse(input);
    if (!parsed.success) throw new PaymentReversalError("invalid_input");
    const value = parsed.data;
    const now = value.now ?? new Date();

    const result = await prisma.$transaction(async (tx) => {
        await lockOrder(tx, value.orderId);
        const order = await tx.paymentOrder.findUnique({
            where: { id: value.orderId },
            include: { fulfillment: true, reversal: true },
        });
        if (!order) throw new PaymentReversalError("order_not_found");

        if (order.reversal) {
            if (order.reversal.outcome === "chargeback" && value.outcome === "refund") {
                throw new PaymentReversalError("reversal_state_conflict");
            }
            if (
                order.reversal.outcome === value.outcome
                && order.reversal.externalReference !== value.externalReference
            ) {
                throw new PaymentReversalError("reversal_identity_conflict");
            }
            if (order.reversal.outcome === "refund" && value.outcome === "chargeback") {
                const previousEvidence = order.reversal.evidence;
                await tx.paymentReversal.update({
                    where: { id: order.reversal.id },
                    data: {
                        outcome: "chargeback",
                        externalReference: value.externalReference,
                        reason: value.reason,
                        evidence: {
                            schemaVersion: 1,
                            priorOutcome: "refund",
                            priorExternalReference: order.reversal.externalReference,
                            entitlementAction: previousEvidence,
                        },
                    },
                });
                if (order.status === "refunded") {
                    assertPaymentOrderTransition(order.status, "chargeback");
                    await tx.paymentOrder.update({
                        where: { id: order.id },
                        data: { status: "chargeback", chargebackAt: now, version: { increment: 1 } },
                    });
                }
            }
            const evidence = order.reversal.evidence as Record<string, unknown>;
            return {
                orderId: order.id,
                reversalId: order.reversal.id,
                duplicate: true,
                status: order.reversal.status,
                outcome: value.outcome,
                removedInventoryItemIds: Array.isArray(evidence.removedInventoryItemIds)
                    ? evidence.removedInventoryItemIds.filter((id): id is number => Number.isInteger(id))
                    : [],
                userId: order.userId,
            };
        }

        if (order.status !== "fulfilled" || order.fulfillment?.status !== "completed") {
            throw new PaymentReversalError(
                order.fulfillment?.status === "completed"
                    ? "order_not_reversible"
                    : "fulfillment_not_completed"
            );
        }
        const grant = readGrantResult(order.fulfillment.grantResult);
        const targetStatus = value.outcome === "refund" ? "refunded" : "chargeback";
        assertPaymentOrderTransition(order.status, targetStatus);

        let reversalStatus: "completed" | "manual_review" = "completed";
        let removedInventoryItemIds: number[] = [];
        let evidence: Prisma.InputJsonValue;

        if (grant.kind === "coin_pack") {
            reversalStatus = "manual_review";
            evidence = {
                schemaVersion: 1,
                kind: "coin_pack",
                policy: "manual_review_no_wallet_mutation",
                coinAmount: grant.coinAmount,
                originalLedgerEntryId: grant.ledgerEntryId,
            };
        } else {
            const expectedPairs = grant.inventoryItemIds.map((id, index) => ({
                id,
                shopItemId: grant.shopItemIds[index],
            }));
            const owned = await tx.inventoryItem.findMany({
                where: { userId: order.userId, id: { in: grant.inventoryItemIds } },
                select: { id: true, shopItemId: true },
            });
            const ownedById = new Map(owned.map((item) => [item.id, item.shopItemId]));
            const mismatched = expectedPairs.filter((item) => {
                const actualShopItemId = ownedById.get(item.id);
                return actualShopItemId !== undefined && actualShopItemId !== item.shopItemId;
            });
            if (mismatched.length > 0) throw new PaymentReversalError("grant_evidence_invalid");

            removedInventoryItemIds = expectedPairs
                .filter((item) => ownedById.get(item.id) === item.shopItemId)
                .map((item) => item.id);
            const removedShopItemIds = expectedPairs
                .filter((item) => removedInventoryItemIds.includes(item.id))
                .map((item) => item.shopItemId);
            const profile = await tx.userProfile.findUnique({ where: { userId: order.userId } });
            if (profile) {
                await tx.userProfile.update({
                    where: { userId: order.userId },
                    data: {
                        avatarItemId: profile.avatarItemId && removedShopItemIds.includes(profile.avatarItemId) ? null : undefined,
                        frameItemId: profile.frameItemId && removedShopItemIds.includes(profile.frameItemId) ? null : undefined,
                        cardBackItemId: profile.cardBackItemId && removedShopItemIds.includes(profile.cardBackItemId) ? null : undefined,
                        cardFaceItemId: profile.cardFaceItemId && removedShopItemIds.includes(profile.cardFaceItemId) ? null : undefined,
                    },
                });
            }
            if (removedInventoryItemIds.length > 0) {
                await tx.inventoryItem.deleteMany({
                    where: { userId: order.userId, id: { in: removedInventoryItemIds } },
                });
            }
            evidence = {
                schemaVersion: 1,
                kind: grant.kind,
                removedInventoryItemIds,
                missingInventoryItemIds: grant.inventoryItemIds.filter(
                    (id) => !removedInventoryItemIds.includes(id)
                ),
                shopItemIds: grant.shopItemIds,
            };
        }

        const reversal = await tx.paymentReversal.create({
            data: {
                orderId: order.id,
                outcome: value.outcome,
                status: reversalStatus,
                externalReference: value.externalReference,
                reason: value.reason,
                evidence,
                requestedByUserId: value.requestedByUserId,
                completedAt: reversalStatus === "completed" ? now : null,
            },
        });
        await tx.paymentFulfillment.update({
            where: { id: order.fulfillment.id },
            data: { status: "reversed", reversedAt: now },
        });
        await tx.paymentOrder.update({
            where: { id: order.id },
            data: {
                status: targetStatus,
                refundedAt: value.outcome === "refund" ? now : undefined,
                chargebackAt: value.outcome === "chargeback" ? now : undefined,
                version: { increment: 1 },
            },
        });
        await tx.notification.create({
            data: {
                userId: order.userId,
                type: "economy",
                title: value.outcome === "refund" ? "Ödeme iadesi işlendi" : "Ödeme ters ibrazı işlendi",
                body: reversalStatus === "manual_review"
                    ? `${order.productNameSnapshot} işlemi güvenli incelemeye alındı.`
                    : `${order.productNameSnapshot} kullanım hakkı ödeme durumuna göre güncellendi.`,
                resourceType: "payment_order",
                resourceId: order.id,
                metadata: { outcome: value.outcome, reversalStatus },
            },
        });
        await tx.paymentReversal.update({
            where: { id: reversal.id },
            data: { notificationSentAt: now },
        });
        return {
            orderId: order.id,
            reversalId: reversal.id,
            duplicate: false,
            status: reversalStatus,
            outcome: value.outcome,
            removedInventoryItemIds,
            userId: order.userId,
        };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

    await Promise.allSettled([
        invalidateJsonCache(getRedisKey("cache", "notification-unread-count", "v1", result.userId)),
        invalidateJsonCache(getRedisKey("cache", "user-dashboard", "v1", result.userId)),
    ]);
    return {
        orderId: result.orderId,
        reversalId: result.reversalId,
        duplicate: result.duplicate,
        status: result.status,
        outcome: result.outcome,
        removedInventoryItemIds: result.removedInventoryItemIds,
    };
}
