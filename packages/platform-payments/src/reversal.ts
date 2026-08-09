import { getRedisKey, invalidateJsonCache } from "@hushle/platform-cache";
import { Prisma, prisma } from "@hushle/platform-db";
import { z } from "zod";
import { assertPaymentOrderTransition } from "./order-state-machine";

const requestSchema = z.object({
    orderId: z.string().uuid(),
    outcome: z.enum(["refund", "chargeback"]),
    externalReference: z.string().trim().min(3).max(191),
    reason: z.string().trim().min(3).max(500),
    requestedByUserId: z.number().int().positive(),
    now: z.date().optional(),
});
const reviewSchema = z.object({
    requestId: z.string().uuid(),
    reviewedByUserId: z.number().int().positive(),
    reviewNote: z.string().trim().min(3).max(500),
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
    requestId: string;
    status: "completed" | "manual_review";
    outcome: "refund" | "chargeback";
    removedInventoryItemIds: number[];
};

export class PaymentReversalError extends Error {
    constructor(public readonly code:
        | "invalid_input"
        | "order_not_found"
        | "request_not_found"
        | "request_not_pending"
        | "admin_actor_required"
        | "second_approver_required"
        | "pending_request_exists"
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

async function assertAdminActor(tx: Prisma.TransactionClient, userId: number): Promise<void> {
    const actor = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (actor?.role !== "admin") throw new PaymentReversalError("admin_actor_required");
}

function readGrantResult(value: Prisma.JsonValue | null) {
    const parsed = grantResultSchema.safeParse(value);
    if (!parsed.success) throw new PaymentReversalError("grant_evidence_invalid");
    return parsed.data;
}

async function invalidateReversalCaches(userId: number): Promise<void> {
    await Promise.allSettled([
        invalidateJsonCache(getRedisKey("cache", "notification-unread-count", "v1", userId)),
        invalidateJsonCache(getRedisKey("cache", "user-dashboard", "v1", userId)),
    ]);
}

export async function requestExternallyConfirmedPaymentReversal(
    input: z.input<typeof requestSchema>
) {
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) throw new PaymentReversalError("invalid_input");
    const value = parsed.data;
    return prisma.$transaction(async (tx) => {
        await lockOrder(tx, value.orderId);
        await assertAdminActor(tx, value.requestedByUserId);
        const order = await tx.paymentOrder.findUnique({
            where: { id: value.orderId },
            include: { fulfillment: true, reversal: true },
        });
        if (!order) throw new PaymentReversalError("order_not_found");
        const pending = await tx.paymentReversalRequest.count({
            where: { orderId: order.id, status: "pending" },
        });
        if (pending > 0) throw new PaymentReversalError("pending_request_exists");

        if (order.reversal) {
            const isChargebackUpgrade = order.reversal.outcome === "refund"
                && value.outcome === "chargeback"
                && order.status === "refunded";
            if (!isChargebackUpgrade) throw new PaymentReversalError("order_not_reversible");
        } else if (order.status !== "fulfilled" || order.fulfillment?.status !== "completed") {
            throw new PaymentReversalError(
                order.fulfillment?.status === "completed"
                    ? "order_not_reversible"
                    : "fulfillment_not_completed"
            );
        }

        return tx.paymentReversalRequest.create({
            data: {
                orderId: order.id,
                outcome: value.outcome,
                externalReference: value.externalReference,
                reason: value.reason,
                requestedByUserId: value.requestedByUserId,
                createdAt: value.now,
            },
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

async function applyApprovedReversal(
    tx: Prisma.TransactionClient,
    request: {
        id: string;
        orderId: string;
        outcome: "refund" | "chargeback";
        externalReference: string;
        reason: string;
        requestedByUserId: number;
    },
    now: Date
) {
    const order = await tx.paymentOrder.findUnique({
        where: { id: request.orderId },
        include: { fulfillment: true, reversal: true },
    });
    if (!order) throw new PaymentReversalError("order_not_found");

    if (order.reversal) {
        if (
            order.reversal.outcome !== "refund"
            || request.outcome !== "chargeback"
            || order.status !== "refunded"
        ) {
            throw new PaymentReversalError("reversal_state_conflict");
        }
        assertPaymentOrderTransition(order.status, "chargeback");
        const updated = await tx.paymentReversal.update({
            where: { id: order.reversal.id },
            data: {
                outcome: "chargeback",
                externalReference: request.externalReference,
                reason: request.reason,
                evidence: {
                    schemaVersion: 1,
                    priorOutcome: "refund",
                    priorExternalReference: order.reversal.externalReference,
                    entitlementAction: order.reversal.evidence,
                },
            },
        });
        await tx.paymentOrder.update({
            where: { id: order.id },
            data: { status: "chargeback", chargebackAt: now, version: { increment: 1 } },
        });
        await tx.notification.create({
            data: {
                userId: order.userId,
                type: "economy",
                title: "Ödeme ters ibrazı işlendi",
                body: `${order.productNameSnapshot} ödeme durumu güncellendi.`,
                resourceType: "payment_order",
                resourceId: order.id,
                metadata: { outcome: "chargeback", reversalStatus: updated.status },
            },
        });
        return {
            orderId: order.id,
            reversalId: updated.id,
            requestId: request.id,
            status: updated.status,
            outcome: request.outcome,
            removedInventoryItemIds: [] as number[],
            userId: order.userId,
        };
    }

    if (order.status !== "fulfilled" || order.fulfillment?.status !== "completed") {
        throw new PaymentReversalError("order_not_reversible");
    }
    const grant = readGrantResult(order.fulfillment.grantResult);
    const targetStatus = request.outcome === "refund" ? "refunded" : "chargeback";
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
        if (expectedPairs.some((item) => {
            const actual = ownedById.get(item.id);
            return actual !== undefined && actual !== item.shopItemId;
        })) throw new PaymentReversalError("grant_evidence_invalid");

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
            outcome: request.outcome,
            status: reversalStatus,
            externalReference: request.externalReference,
            reason: request.reason,
            evidence,
            requestedByUserId: request.requestedByUserId,
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
            refundedAt: request.outcome === "refund" ? now : undefined,
            chargebackAt: request.outcome === "chargeback" ? now : undefined,
            version: { increment: 1 },
        },
    });
    await tx.notification.create({
        data: {
            userId: order.userId,
            type: "economy",
            title: request.outcome === "refund" ? "Ödeme iadesi işlendi" : "Ödeme ters ibrazı işlendi",
            body: reversalStatus === "manual_review"
                ? `${order.productNameSnapshot} işlemi güvenli incelemeye alındı.`
                : `${order.productNameSnapshot} kullanım hakkı ödeme durumuna göre güncellendi.`,
            resourceType: "payment_order",
            resourceId: order.id,
            metadata: { outcome: request.outcome, reversalStatus },
        },
    });
    await tx.paymentReversal.update({
        where: { id: reversal.id },
        data: { notificationSentAt: now },
    });
    return {
        orderId: order.id,
        reversalId: reversal.id,
        requestId: request.id,
        status: reversalStatus,
        outcome: request.outcome,
        removedInventoryItemIds,
        userId: order.userId,
    };
}

export async function approvePaymentReversalRequest(
    input: z.input<typeof reviewSchema>
): Promise<PaymentReversalResult> {
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) throw new PaymentReversalError("invalid_input");
    const value = parsed.data;
    const initial = await prisma.paymentReversalRequest.findUnique({
        where: { id: value.requestId },
        select: { orderId: true },
    });
    if (!initial) throw new PaymentReversalError("request_not_found");
    const now = value.now ?? new Date();
    const result = await prisma.$transaction(async (tx) => {
        await lockOrder(tx, initial.orderId);
        const request = await tx.paymentReversalRequest.findUnique({
            where: { id: value.requestId },
        });
        if (!request) throw new PaymentReversalError("request_not_found");
        await assertAdminActor(tx, value.reviewedByUserId);
        if (request.status !== "pending") throw new PaymentReversalError("request_not_pending");
        if (request.requestedByUserId === value.reviewedByUserId) {
            throw new PaymentReversalError("second_approver_required");
        }
        const applied = await applyApprovedReversal(tx, request, now);
        await tx.paymentReversalRequest.update({
            where: { id: request.id },
            data: {
                status: "approved",
                reviewedByUserId: value.reviewedByUserId,
                reviewNote: value.reviewNote,
                reviewedAt: now,
            },
        });
        return applied;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    await invalidateReversalCaches(result.userId);
    return {
        orderId: result.orderId,
        reversalId: result.reversalId,
        requestId: result.requestId,
        status: result.status,
        outcome: result.outcome,
        removedInventoryItemIds: result.removedInventoryItemIds,
    };
}

export async function rejectPaymentReversalRequest(
    input: z.input<typeof reviewSchema>
) {
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) throw new PaymentReversalError("invalid_input");
    const value = parsed.data;
    const initial = await prisma.paymentReversalRequest.findUnique({
        where: { id: value.requestId },
        select: { orderId: true },
    });
    if (!initial) throw new PaymentReversalError("request_not_found");
    return prisma.$transaction(async (tx) => {
        await lockOrder(tx, initial.orderId);
        const request = await tx.paymentReversalRequest.findUnique({ where: { id: value.requestId } });
        if (!request) throw new PaymentReversalError("request_not_found");
        await assertAdminActor(tx, value.reviewedByUserId);
        if (request.status !== "pending") throw new PaymentReversalError("request_not_pending");
        if (request.requestedByUserId === value.reviewedByUserId) {
            throw new PaymentReversalError("second_approver_required");
        }
        return tx.paymentReversalRequest.update({
            where: { id: request.id },
            data: {
                status: "rejected",
                reviewedByUserId: value.reviewedByUserId,
                reviewNote: value.reviewNote,
                reviewedAt: value.now ?? new Date(),
            },
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
