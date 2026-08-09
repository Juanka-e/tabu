import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "@hushle/platform-db";
import {
    approveProviderApiRefundRequest,
    PaytrAdapterError,
    PaymentReversalError,
    recoverProviderApiRefundRequest,
    requestProviderApiPaymentRefund,
    type PaymentRefundAdapter,
} from "@hushle/platform-payments";

async function createFulfilledCosmeticOrder(userId: number, suffix: string) {
    const shopItem = await prisma.shopItem.create({
        data: { code: `refund_${suffix}`, type: "avatar", name: `Refund ${suffix}`, priceCoin: 0, imageUrl: "/refund.png" },
    });
    const inventory = await prisma.inventoryItem.create({ data: { userId, shopItemId: shopItem.id, source: "grant" } });
    const id = randomUUID();
    const order = await prisma.paymentOrder.create({
        data: {
            id, userId, provider: "paytr", status: "fulfilled",
            idempotencyKey: `provider-refund:${suffix}`, requestFingerprint: "f".repeat(64),
            productKind: "cosmetic_item", productReference: `refund_${suffix}`, productVersion: 1,
            productNameSnapshot: `Refund ${suffix}`, quantity: 1, unitAmountMinor: 1_250,
            totalAmountMinor: 1_250, currency: "TRY",
            grantSnapshot: { schemaVersion: 1, items: [{ shopItemId: shopItem.id }] },
            providerOrderReference: id.replaceAll("-", ""), paidAt: new Date(), fulfilledAt: new Date(),
            fulfillment: {
                create: {
                    status: "completed", fulfillmentKey: `provider-refund:${suffix}`,
                    attemptCount: 1, completedAt: new Date(),
                    grantResult: { schemaVersion: 1, kind: "cosmetic_item", shopItemIds: [shopItem.id], inventoryItemIds: [inventory.id] },
                },
            },
        },
    });
    return { order, shopItem, inventory };
}

async function run() {
    assert.equal(process.env.PAYMENT_PROVIDER_REFUND_INTEGRATION_TEST, "true");
    assert.match(process.env.DATABASE_URL ?? "", /tabu_test/);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const user = await prisma.user.create({ data: { username: `refund_user_${suffix}`, password: "integration-test" } });
    const requester = await prisma.user.create({ data: { username: `refund_req_${suffix}`, password: "integration-test", role: "admin" } });
    const reviewer = await prisma.user.create({ data: { username: `refund_rev_${suffix}`, password: "integration-test", role: "admin" } });
    const shopItemIds: number[] = [];
    try {
        const success = await createFulfilledCosmeticOrder(user.id, `${suffix}_ok`);
        shopItemIds.push(success.shopItem.id);
        const successRequest = await requestProviderApiPaymentRefund({ orderId: success.order.id, reason: "sandbox full refund", requestedByUserId: requester.id });
        assert.equal(successRequest.executionMode, "provider_api");
        assert.match(successRequest.externalReference, /^RF[a-f0-9]{32}$/);
        const successfulAdapter: PaymentRefundAdapter = {
            provider: "paytr",
            refund: async (request) => ({ provider: "paytr", referenceNo: request.referenceNo, amountMinor: request.amountMinor, currency: request.currency, testMode: true }),
        };
        await assert.rejects(
            () => approveProviderApiRefundRequest({ requestId: successRequest.id, reviewedByUserId: requester.id, reviewNote: "self approval", adapter: successfulAdapter }),
            (error: unknown) => error instanceof PaymentReversalError && error.code === "second_approver_required"
        );
        const applied = await approveProviderApiRefundRequest({ requestId: successRequest.id, reviewedByUserId: reviewer.id, reviewNote: "second admin approved", adapter: successfulAdapter });
        assert.equal(applied.outcome, "applied");
        assert.equal((await prisma.paymentOrder.findUniqueOrThrow({ where: { id: success.order.id } })).status, "refunded");
        assert.equal(await prisma.inventoryItem.count({ where: { id: success.inventory.id } }), 0);
        assert.equal((await prisma.paymentProviderRefundAttempt.findUniqueOrThrow({ where: { reversalRequestId: successRequest.id } })).status, "succeeded");

        const uncertain = await createFulfilledCosmeticOrder(user.id, `${suffix}_uncertain`);
        shopItemIds.push(uncertain.shopItem.id);
        const uncertainRequest = await requestProviderApiPaymentRefund({ orderId: uncertain.order.id, reason: "timeout recovery", requestedByUserId: requester.id });
        const timeoutAdapter: PaymentRefundAdapter = { provider: "paytr", refund: async () => { throw new PaytrAdapterError("provider_timeout"); } };
        const review = await approveProviderApiRefundRequest({ requestId: uncertainRequest.id, reviewedByUserId: reviewer.id, reviewNote: "timeout expected", adapter: timeoutAdapter });
        assert.equal(review.outcome, "provider_review");
        assert.equal((await prisma.paymentOrder.findUniqueOrThrow({ where: { id: uncertain.order.id } })).status, "fulfilled");
        await assert.rejects(
            () => requestProviderApiPaymentRefund({ orderId: uncertain.order.id, reason: "blind retry", requestedByUserId: requester.id }),
            (error: unknown) => error instanceof PaymentReversalError && error.code === "pending_request_exists"
        );
        const recovered = await recoverProviderApiRefundRequest({
            requestId: uncertainRequest.id,
            checkedByUserId: reviewer.id,
            query: async () => ({
                status: "success", paymentAmountMinor: 1_250, paymentTotalMinor: 1_250,
                currency: "TRY", testMode: true, returnCount: 1,
                refunds: [{ referenceNo: uncertainRequest.externalReference, amountMinor: 1_250, completed: true }],
            }),
        });
        assert.equal(recovered.outcome, "applied");
        assert.equal((await prisma.paymentOrder.findUniqueOrThrow({ where: { id: uncertain.order.id } })).status, "refunded");

        const failed = await createFulfilledCosmeticOrder(user.id, `${suffix}_failed`);
        shopItemIds.push(failed.shopItem.id);
        const failedRequest = await requestProviderApiPaymentRefund({ orderId: failed.order.id, reason: "provider rejection", requestedByUserId: requester.id });
        const rejectedAdapter: PaymentRefundAdapter = { provider: "paytr", refund: async () => { throw new PaytrAdapterError("provider_rejected"); } };
        const rejected = await approveProviderApiRefundRequest({ requestId: failedRequest.id, reviewedByUserId: reviewer.id, reviewNote: "rejection expected", adapter: rejectedAdapter });
        assert.equal(rejected.outcome, "provider_failed");
        assert.equal((await prisma.paymentOrder.findUniqueOrThrow({ where: { id: failed.order.id } })).status, "fulfilled");
        assert.equal(await prisma.inventoryItem.count({ where: { id: failed.inventory.id } }), 1);
    } finally {
        await prisma.notification.deleteMany({ where: { userId: user.id } });
        await prisma.paymentProviderRefundAttempt.deleteMany({ where: { reversalRequest: { order: { userId: user.id } } } });
        await prisma.paymentReversalRequest.deleteMany({ where: { order: { userId: user.id } } });
        await prisma.paymentReversal.deleteMany({ where: { order: { userId: user.id } } });
        await prisma.paymentFulfillment.deleteMany({ where: { order: { userId: user.id } } });
        await prisma.paymentOrder.deleteMany({ where: { userId: user.id } });
        await prisma.inventoryItem.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: { in: [user.id, requester.id, reviewer.id] } } });
        await prisma.shopItem.deleteMany({ where: { id: { in: shopItemIds } } });
        await prisma.$disconnect();
    }
    console.log("Provider refund approval, uncertainty and recovery integration checks passed");
}

void run();
