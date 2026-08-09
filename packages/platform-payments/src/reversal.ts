import { getRedisKey, invalidateJsonCache } from "@hushle/platform-cache";
import { Prisma, prisma } from "@hushle/platform-db";
import { reversePaymentCoinLot } from "@hushle/platform-wallet";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { assertPaymentOrderTransition } from "./order-state-machine";
import type { PaymentRefundAdapter } from "./refunds";
import { PaytrAdapterError, type PaytrStatusQueryResult } from "./adapters/paytr";

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
const providerRequestSchema = z.object({
    orderId: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
    requestedByUserId: z.number().int().positive(),
    now: z.date().optional(),
});
const recoverySchema = z.object({
    requestId: z.string().uuid(),
    checkedByUserId: z.number().int().positive(),
    now: z.date().optional(),
});

const ACTIVE_REVERSAL_REQUEST_STATUSES = ["pending", "processing", "provider_review"] as const;
const grantResultSchema = z.discriminatedUnion("kind", [
    z.object({
        schemaVersion: z.literal(1),
        kind: z.literal("coin_pack"),
        coinAmount: z.number().int().positive(),
        ledgerEntryId: z.number().int().positive(),
        coinLotId: z.string().uuid().optional(),
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
        | "execution_mode_conflict"
        | "provider_refund_unavailable"
        | "provider_refund_not_recoverable"
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
            where: { orderId: order.id, status: { in: [...ACTIVE_REVERSAL_REQUEST_STATUSES] } },
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
                executionMode: "externally_confirmed",
                createdAt: value.now,
            },
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

export async function requestProviderApiPaymentRefund(
    input: z.input<typeof providerRequestSchema>
) {
    const parsed = providerRequestSchema.safeParse(input);
    if (!parsed.success) throw new PaymentReversalError("invalid_input");
    const value = parsed.data;
    const requestId = randomUUID();
    const referenceNo = `RF${requestId.replaceAll("-", "")}`;
    return prisma.$transaction(async (tx) => {
        await lockOrder(tx, value.orderId);
        await assertAdminActor(tx, value.requestedByUserId);
        const order = await tx.paymentOrder.findUnique({
            where: { id: value.orderId },
            include: { fulfillment: true, reversal: true },
        });
        if (!order) throw new PaymentReversalError("order_not_found");
        const active = await tx.paymentReversalRequest.count({
            where: { orderId: order.id, status: { in: [...ACTIVE_REVERSAL_REQUEST_STATUSES] } },
        });
        if (active > 0) throw new PaymentReversalError("pending_request_exists");
        if (
            order.provider !== "paytr"
            || order.status !== "fulfilled"
            || order.fulfillment?.status !== "completed"
            || order.reversal
            || !order.providerOrderReference
            || !/^[A-Za-z0-9]{1,64}$/.test(order.providerOrderReference)
        ) {
            throw new PaymentReversalError("order_not_reversible");
        }
        return tx.paymentReversalRequest.create({
            data: {
                id: requestId,
                orderId: order.id,
                outcome: "refund",
                status: "pending",
                executionMode: "provider_api",
                externalReference: referenceNo,
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
    let manualReviewCase: { reasonCode: string; unrecoveredCoin: number | null } | null = null;

    if (grant.kind === "coin_pack") {
        if (grant.coinLotId) {
            const coinReversal = await reversePaymentCoinLot(tx, {
                userId: order.userId,
                orderId: order.id,
                coinLotId: grant.coinLotId,
                reversalRequestId: request.id,
                metadata: {
                    outcome: request.outcome,
                    originalLedgerEntryId: grant.ledgerEntryId,
                },
            });
            reversalStatus = coinReversal.unrecoveredCoin === 0 ? "completed" : "manual_review";
            if (coinReversal.unrecoveredCoin > 0) {
                manualReviewCase = {
                    reasonCode: "coin_spent_unrecovered",
                    unrecoveredCoin: coinReversal.unrecoveredCoin,
                };
            }
            evidence = {
                schemaVersion: 2,
                kind: "coin_pack",
                policy: "exact_payment_lot_reversal",
                coinAmount: grant.coinAmount,
                coinLotId: grant.coinLotId,
                originalLedgerEntryId: grant.ledgerEntryId,
                reversalLedgerEntryId: coinReversal.reversalLedgerEntryId,
                reversedCoin: coinReversal.reversedCoin,
                unrecoveredCoin: coinReversal.unrecoveredCoin,
                balanceAfter: coinReversal.balanceAfter,
            };
        } else {
            reversalStatus = "manual_review";
            manualReviewCase = {
                reasonCode: "legacy_coin_provenance_missing",
                unrecoveredCoin: null,
            };
            evidence = {
                schemaVersion: 1,
                kind: "coin_pack",
                policy: "legacy_manual_review_no_wallet_mutation",
                coinAmount: grant.coinAmount,
                originalLedgerEntryId: grant.ledgerEntryId,
            };
        }
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
    if (manualReviewCase) {
        await tx.paymentManualReviewCase.create({
            data: {
                reversalId: reversal.id,
                reasonCode: manualReviewCase.reasonCode,
                unrecoveredCoin: manualReviewCase.unrecoveredCoin,
            },
        });
    }
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
        if (request.executionMode !== "externally_confirmed") {
            throw new PaymentReversalError("execution_mode_conflict");
        }
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

type ProviderRefundOutcome =
    | { outcome: "applied"; result: PaymentReversalResult }
    | { outcome: "provider_failed" | "provider_review"; requestId: string; attemptId: string };

async function finishProviderAttemptWithoutReversal(input: {
    requestId: string;
    attemptId: string;
    requestStatus: "provider_failed" | "provider_review";
    attemptStatus: "failed" | "uncertain";
    errorCode: string;
    now: Date;
}): Promise<ProviderRefundOutcome> {
    await prisma.$transaction(async (tx) => {
        const request = await tx.paymentReversalRequest.findUnique({
            where: { id: input.requestId },
            select: { orderId: true, status: true },
        });
        if (!request) throw new PaymentReversalError("request_not_found");
        await lockOrder(tx, request.orderId);
        const current = await tx.paymentReversalRequest.findUnique({ where: { id: input.requestId } });
        const attempt = await tx.paymentProviderRefundAttempt.findUnique({ where: { id: input.attemptId } });
        if (!current || !attempt) throw new PaymentReversalError("request_not_found");
        if (!["processing", "provider_review"].includes(current.status)) return;
        if (!["processing", "uncertain"].includes(attempt.status)) return;
        await tx.paymentProviderRefundAttempt.update({
            where: { id: attempt.id },
            data: {
                status: input.attemptStatus,
                errorCode: input.errorCode,
                completedAt: input.attemptStatus === "failed" ? input.now : null,
                lastCheckedAt: input.now,
            },
        });
        await tx.paymentReversalRequest.update({
            where: { id: current.id },
            data: { status: input.requestStatus },
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    return { outcome: input.requestStatus, requestId: input.requestId, attemptId: input.attemptId };
}

async function applyVerifiedProviderRefund(input: {
    requestId: string;
    attemptId: string;
    actorUserId: number;
    now: Date;
}): Promise<ProviderRefundOutcome> {
    const applied = await prisma.$transaction(async (tx) => {
        const initial = await tx.paymentReversalRequest.findUnique({
            where: { id: input.requestId },
            select: { orderId: true },
        });
        if (!initial) throw new PaymentReversalError("request_not_found");
        await lockOrder(tx, initial.orderId);
        await assertAdminActor(tx, input.actorUserId);
        const request = await tx.paymentReversalRequest.findUnique({ where: { id: input.requestId } });
        const attempt = await tx.paymentProviderRefundAttempt.findUnique({ where: { id: input.attemptId } });
        if (!request || !attempt) throw new PaymentReversalError("request_not_found");
        if (request.executionMode !== "provider_api") throw new PaymentReversalError("execution_mode_conflict");
        if (!["processing", "provider_review"].includes(request.status)) {
            throw new PaymentReversalError("request_not_pending");
        }
        if (!["processing", "uncertain"].includes(attempt.status)) {
            throw new PaymentReversalError("provider_refund_not_recoverable");
        }
        const result = await applyApprovedReversal(tx, request, input.now);
        await tx.paymentProviderRefundAttempt.update({
            where: { id: attempt.id },
            data: { status: "succeeded", errorCode: null, completedAt: input.now, lastCheckedAt: input.now },
        });
        await tx.paymentReversalRequest.update({
            where: { id: request.id },
            data: { status: "approved" },
        });
        return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    await invalidateReversalCaches(applied.userId);
    return {
        outcome: "applied",
        result: {
            orderId: applied.orderId,
            reversalId: applied.reversalId,
            requestId: applied.requestId,
            status: applied.status,
            outcome: applied.outcome,
            removedInventoryItemIds: applied.removedInventoryItemIds,
        },
    };
}

export async function approveProviderApiRefundRequest(input: z.input<typeof reviewSchema> & {
    adapter: PaymentRefundAdapter | null;
}): Promise<ProviderRefundOutcome> {
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) throw new PaymentReversalError("invalid_input");
    if (!input.adapter || input.adapter.provider !== "paytr") {
        throw new PaymentReversalError("provider_refund_unavailable");
    }
    const value = parsed.data;
    const now = value.now ?? new Date();
    const prepared = await prisma.$transaction(async (tx) => {
        const initial = await tx.paymentReversalRequest.findUnique({
            where: { id: value.requestId },
            select: { orderId: true },
        });
        if (!initial) throw new PaymentReversalError("request_not_found");
        await lockOrder(tx, initial.orderId);
        const request = await tx.paymentReversalRequest.findUnique({ where: { id: value.requestId } });
        if (!request) throw new PaymentReversalError("request_not_found");
        await assertAdminActor(tx, value.reviewedByUserId);
        if (request.status !== "pending") throw new PaymentReversalError("request_not_pending");
        if (request.executionMode !== "provider_api" || request.outcome !== "refund") {
            throw new PaymentReversalError("execution_mode_conflict");
        }
        if (request.requestedByUserId === value.reviewedByUserId) {
            throw new PaymentReversalError("second_approver_required");
        }
        const order = await tx.paymentOrder.findUnique({ where: { id: request.orderId } });
        if (!order?.providerOrderReference || order.provider !== "paytr" || order.status !== "fulfilled") {
            throw new PaymentReversalError("order_not_reversible");
        }
        const attempt = await tx.paymentProviderRefundAttempt.create({
            data: {
                reversalRequestId: request.id,
                provider: "paytr",
                status: "processing",
                amountMinor: order.totalAmountMinor,
                currency: order.currency,
                referenceNo: request.externalReference,
                startedAt: now,
            },
        });
        await tx.paymentReversalRequest.update({
            where: { id: request.id },
            data: {
                status: "processing",
                reviewedByUserId: value.reviewedByUserId,
                reviewNote: value.reviewNote,
                reviewedAt: now,
            },
        });
        return { request, order, attempt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

    try {
        const result = await input.adapter.refund({
            merchantOrderId: prepared.order.providerOrderReference!,
            amountMinor: prepared.order.totalAmountMinor,
            currency: prepared.order.currency,
            referenceNo: prepared.attempt.referenceNo,
        });
        if (!result.testMode) {
            return finishProviderAttemptWithoutReversal({
                requestId: prepared.request.id,
                attemptId: prepared.attempt.id,
                requestStatus: "provider_review",
                attemptStatus: "uncertain",
                errorCode: "provider_mode_mismatch",
                now,
            });
        }
        return applyVerifiedProviderRefund({
            requestId: prepared.request.id,
            attemptId: prepared.attempt.id,
            actorUserId: value.reviewedByUserId,
            now,
        });
    } catch (error) {
        const definitive = error instanceof PaytrAdapterError && error.code === "provider_rejected";
        return finishProviderAttemptWithoutReversal({
            requestId: prepared.request.id,
            attemptId: prepared.attempt.id,
            requestStatus: definitive ? "provider_failed" : "provider_review",
            attemptStatus: definitive ? "failed" : "uncertain",
            errorCode: error instanceof PaytrAdapterError ? error.code : "provider_unknown_error",
            now,
        });
    }
}

export async function recoverProviderApiRefundRequest(input: z.input<typeof recoverySchema> & {
    query: () => Promise<PaytrStatusQueryResult>;
}): Promise<ProviderRefundOutcome> {
    const parsed = recoverySchema.safeParse(input);
    if (!parsed.success) throw new PaymentReversalError("invalid_input");
    const value = parsed.data;
    const now = value.now ?? new Date();
    const current = await prisma.paymentReversalRequest.findUnique({
        where: { id: value.requestId },
        include: { providerRefundAttempt: true },
    });
    if (!current) throw new PaymentReversalError("request_not_found");
    await prisma.$transaction((tx) => assertAdminActor(tx, value.checkedByUserId));
    if (current.executionMode !== "provider_api" || !["processing", "provider_review"].includes(current.status)) {
        throw new PaymentReversalError("provider_refund_not_recoverable");
    }
    const attempt = current.providerRefundAttempt;
    if (!attempt || !["processing", "uncertain"].includes(attempt.status)) {
        throw new PaymentReversalError("provider_refund_not_recoverable");
    }
    let status: PaytrStatusQueryResult;
    try {
        status = await input.query();
    } catch {
        return finishProviderAttemptWithoutReversal({
            requestId: current.id,
            attemptId: attempt.id,
            requestStatus: "provider_review",
            attemptStatus: "uncertain",
            errorCode: "status_query_failed",
            now,
        });
    }
    if (status.status !== "success" || !status.testMode) {
        return finishProviderAttemptWithoutReversal({
            requestId: current.id,
            attemptId: attempt.id,
            requestStatus: "provider_review",
            attemptStatus: "uncertain",
            errorCode: status.status === "error" ? status.errorCode : "provider_mode_mismatch",
            now,
        });
    }
    const refund = (status.refunds ?? []).find((entry) => entry.referenceNo === attempt.referenceNo);
    if (status.currency !== attempt.currency || !refund || refund.amountMinor !== attempt.amountMinor || !refund.completed) {
        return finishProviderAttemptWithoutReversal({
            requestId: current.id,
            attemptId: attempt.id,
            requestStatus: "provider_review",
            attemptStatus: "uncertain",
            errorCode: status.currency !== attempt.currency
                ? "refund_currency_mismatch"
                : !refund
                    ? "refund_not_observed"
                    : refund.amountMinor !== attempt.amountMinor
                        ? "refund_amount_mismatch"
                        : "refund_not_completed",
            now,
        });
    }
    return applyVerifiedProviderRefund({
        requestId: current.id,
        attemptId: attempt.id,
        actorUserId: value.checkedByUserId,
        now,
    });
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
