import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@hushle/platform-db";
import {
    fulfillPaidPaymentOrder,
    reconcilePaytrOrder,
    reverseExternallyConfirmedPayment,
} from "@hushle/platform-payments";

async function createOrder(input: {
    userId: number;
    suffix: string;
    status: "paid" | "awaiting_payment";
    kind: "coin_pack" | "cosmetic_item";
    grantSnapshot: Prisma.InputJsonValue;
}) {
    const id = randomUUID();
    return prisma.paymentOrder.create({ data: {
        id,
        userId: input.userId,
        provider: "paytr",
        status: input.status,
        idempotencyKey: `reversal:${input.suffix}`,
        requestFingerprint: "c".repeat(64),
        productKind: input.kind,
        productReference: `product_${input.suffix}`,
        productVersion: 1,
        productNameSnapshot: `Product ${input.suffix}`,
        quantity: 1,
        unitAmountMinor: 10_000,
        totalAmountMinor: 10_000,
        currency: "TRY",
        grantSnapshot: input.grantSnapshot,
        providerOrderReference: id.replaceAll("-", ""),
        paidAt: input.status === "paid" ? new Date() : null,
    } });
}

async function run(): Promise<void> {
    assert.equal(process.env.PAYMENT_REVERSAL_INTEGRATION_TEST, "true");
    assert.match(process.env.DATABASE_URL ?? "", /tabu_test/);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 14);
    const user = await prisma.user.create({ data: { username: `reversal_${suffix}`, password: "integration-test" } });
    const paidItem = await prisma.shopItem.create({ data: { code: `paid_${suffix}`, type: "avatar", name: "Paid Avatar", priceCoin: 0, imageUrl: "/paid.png" } });
    const unrelatedItem = await prisma.shopItem.create({ data: { code: `unrelated_${suffix}`, type: "frame", name: "Unrelated Frame", priceCoin: 0, imageUrl: "/unrelated.png" } });
    const cosmeticSnapshot = { schemaVersion: 1, items: [{ shopItemId: paidItem.id, renderSnapshot: { type: "avatar", imageUrl: "/paid.png" } }] };
    try {
        await prisma.inventoryItem.create({ data: { userId: user.id, shopItemId: unrelatedItem.id, source: "grant" } });
        const cosmeticOrder = await createOrder({ userId: user.id, suffix: `${suffix}:cosmetic`, status: "paid", kind: "cosmetic_item", grantSnapshot: cosmeticSnapshot });
        const grant = await fulfillPaidPaymentOrder({ orderId: cosmeticOrder.id });
        await prisma.userProfile.create({ data: { userId: user.id, avatarItemId: paidItem.id, frameItemId: unrelatedItem.id } });
        const [first, second] = await Promise.all([
            reverseExternallyConfirmedPayment({ orderId: cosmeticOrder.id, outcome: "refund", externalReference: `refund-${suffix}`, reason: "integration refund" }),
            reverseExternallyConfirmedPayment({ orderId: cosmeticOrder.id, outcome: "refund", externalReference: `refund-${suffix}`, reason: "integration refund" }),
        ]);
        assert.equal([first, second].filter((entry) => !entry.duplicate).length, 1);
        assert.equal(await prisma.inventoryItem.count({ where: { id: { in: grant.grant.kind === "coin_pack" ? [] : grant.grant.inventoryItemIds } } }), 0);
        assert.equal(await prisma.inventoryItem.count({ where: { userId: user.id, shopItemId: unrelatedItem.id } }), 1);
        const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId: user.id } });
        assert.equal(profile.avatarItemId, null);
        assert.equal(profile.frameItemId, unrelatedItem.id);
        assert.equal((await prisma.paymentOrder.findUniqueOrThrow({ where: { id: cosmeticOrder.id } })).status, "refunded");
        assert.equal(await prisma.notification.count({ where: { resourceId: cosmeticOrder.id } }), 1);

        const chargeback = await reverseExternallyConfirmedPayment({ orderId: cosmeticOrder.id, outcome: "chargeback", externalReference: `chargeback-${suffix}`, reason: "integration chargeback" });
        assert.equal(chargeback.duplicate, true);
        assert.equal((await prisma.paymentOrder.findUniqueOrThrow({ where: { id: cosmeticOrder.id } })).status, "chargeback");
        assert.equal(await prisma.notification.count({ where: { resourceId: cosmeticOrder.id } }), 1);

        const coinOrder = await createOrder({ userId: user.id, suffix: `${suffix}:coin`, status: "paid", kind: "coin_pack", grantSnapshot: { schemaVersion: 1, coinAmount: 500 } });
        await fulfillPaidPaymentOrder({ orderId: coinOrder.id });
        const balanceBefore = (await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } })).coinBalance;
        const coinReversal = await reverseExternallyConfirmedPayment({ orderId: coinOrder.id, outcome: "refund", externalReference: `coin-refund-${suffix}`, reason: "coin review" });
        assert.equal(coinReversal.status, "manual_review");
        assert.equal((await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } })).coinBalance, balanceBefore);

        const reconciliationOrder = await createOrder({ userId: user.id, suffix: `${suffix}:reconcile`, status: "awaiting_payment", kind: "cosmetic_item", grantSnapshot: cosmeticSnapshot });
        const reconciled = await reconcilePaytrOrder({
            order: reconciliationOrder,
            credentials: { merchantId: "123", merchantKey: "key", merchantSalt: "salt" },
            query: async () => ({ status: "success", paymentAmountMinor: 10_000, paymentTotalMinor: 10_000, currency: "TRY", testMode: true, returnCount: 0 }),
            now: new Date(),
            retryDelayMinutes: 15,
        });
        assert.equal(reconciled, "fulfilled");
        assert.equal((await prisma.paymentOrder.findUniqueOrThrow({ where: { id: reconciliationOrder.id } })).status, "fulfilled");
        assert.equal((await prisma.paymentReconciliationCase.findUniqueOrThrow({ where: { orderId: reconciliationOrder.id } })).status, "resolved");
    } finally {
        await prisma.notification.deleteMany({ where: { userId: user.id } });
        await prisma.paymentReversal.deleteMany({ where: { order: { userId: user.id } } });
        await prisma.paymentReconciliationCase.deleteMany({ where: { order: { userId: user.id } } });
        await prisma.paymentWebhookEvent.deleteMany({ where: { order: { userId: user.id } } });
        await prisma.paymentFulfillment.deleteMany({ where: { order: { userId: user.id } } });
        await prisma.paymentOrder.deleteMany({ where: { userId: user.id } });
        await prisma.inventoryItem.deleteMany({ where: { userId: user.id } });
        await prisma.walletLedgerEntry.deleteMany({ where: { wallet: { userId: user.id } } });
        await prisma.wallet.deleteMany({ where: { userId: user.id } });
        await prisma.userProfile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.shopItem.deleteMany({ where: { id: { in: [paidItem.id, unrelatedItem.id] } } });
        await prisma.$disconnect();
    }
    console.log("Payment reconciliation and reversal integration checks passed");
}

void run();
