import assert from "node:assert/strict";
import {
    bundleWriteSchema,
    couponCodeWriteSchema,
    discountCampaignWriteSchema,
} from "../src/lib/promotions/promotion-schema";

const bundleResult = bundleWriteSchema.safeParse({
    code: "launch_pack",
    name: "Launch Pack",
    description: "Initial cosmetics bundle",
    priceCoin: 450,
    isActive: true,
    sortOrder: 1,
    items: [
        { shopItemId: 1, sortOrder: 0 },
        { shopItemId: 2, sortOrder: 1 },
    ],
});

assert.equal(bundleResult.success, true);

const invalidDiscount = discountCampaignWriteSchema.safeParse({
    code: "wrong_target",
    name: "Wrong Target",
    targetType: "shop_item",
    discountType: "percentage",
    percentageOff: 15,
    fixedCoinOff: null,
    shopItemId: null,
    bundleId: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
    stackableWithCoupon: false,
});

assert.equal(invalidDiscount.success, false);

const couponResult = couponCodeWriteSchema.safeParse({
    code: "spring25",
    name: "Spring 25",
    description: "Seasonal launch code",
    targetType: "global",
    discountType: "fixed_coin",
    percentageOff: null,
    fixedCoinOff: 25,
    shopItemId: null,
    bundleId: null,
    usageLimit: 100,
    startsAt: "2026-03-09T10:00:00.000Z",
    endsAt: "2026-03-19T10:00:00.000Z",
    isActive: true,
});

assert.equal(couponResult.success, true);

console.log("promotion schema smoke test passed");
