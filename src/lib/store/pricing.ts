import type {
    CouponPreviewView,
    PromotionDiscountType,
    PromotionSummaryView,
    PromotionTargetType,
    StorePriceView,
} from "@/types/economy";

interface TimedPromotionRecord {
    id: number;
    code: string;
    name: string;
    description: string | null;
    targetType: PromotionTargetType;
    discountType: PromotionDiscountType;
    percentageOff: number | null;
    fixedCoinOff: number | null;
    shopItemId: number | null;
    bundleId: number | null;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
}

interface DiscountRecord extends TimedPromotionRecord {
    stackableWithCoupon: boolean;
    usageLimit: number | null;
    usedCount: number;
}

interface CouponRecord extends TimedPromotionRecord {
    usageLimit: number | null;
    usedCount: number;
}

export interface PromotionTargetContext {
    kind: "shop_item" | "bundle";
    targetId: number;
}

export type CouponPricingResult = {
    ok: true;
    pricing: StorePriceView;
    coupon: CouponPreviewView;
    couponDiscountCoin: number;
} | {
    ok: false;
    reason: string;
};

function isWithinWindow(startsAt: Date | null, endsAt: Date | null, now: Date): boolean {
    if (startsAt && startsAt.getTime() > now.getTime()) {
        return false;
    }

    if (endsAt && endsAt.getTime() < now.getTime()) {
        return false;
    }

    return true;
}

function matchesTarget(
    promotion: TimedPromotionRecord,
    target: PromotionTargetContext
): boolean {
    if (promotion.targetType === "global") {
        return true;
    }

    if (promotion.targetType === "shop_item") {
        return target.kind === "shop_item" && promotion.shopItemId === target.targetId;
    }

    return target.kind === "bundle" && promotion.bundleId === target.targetId;
}

function calculateDiscountAmount(
    priceCoin: number,
    discountType: PromotionDiscountType,
    percentageOff: number | null,
    fixedCoinOff: number | null
): number {
    if (priceCoin <= 0) {
        return 0;
    }

    if (discountType === "percentage") {
        const percentage = Math.max(0, Math.min(percentageOff ?? 0, 100));
        return Math.min(priceCoin, Math.round((priceCoin * percentage) / 100));
    }

    const fixedAmount = Math.max(0, fixedCoinOff ?? 0);
    return Math.min(priceCoin, fixedAmount);
}

function toPromotionSummary(discount: DiscountRecord): PromotionSummaryView {
    return {
        id: discount.id,
        code: discount.code,
        name: discount.name,
        description: discount.description,
        discountType: discount.discountType,
        percentageOff: discount.percentageOff,
        fixedCoinOff: discount.fixedCoinOff,
        stackableWithCoupon: discount.stackableWithCoupon,
        usageLimit: discount.usageLimit,
        usedCount: discount.usedCount,
    };
}

function toCouponSummary(coupon: CouponRecord): CouponPreviewView {
    return {
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        percentageOff: coupon.percentageOff,
        fixedCoinOff: coupon.fixedCoinOff,
    };
}

export function resolveCatalogPricing(
    basePriceCoin: number,
    target: PromotionTargetContext,
    discounts: DiscountRecord[],
    now: Date
): StorePriceView {
    const applicableDiscounts = discounts.filter(
        (discount) => (
            discount.isActive &&
            isWithinWindow(discount.startsAt, discount.endsAt, now) &&
            matchesTarget(discount, target) &&
            (discount.usageLimit === null || discount.usedCount < discount.usageLimit)
        )
    );

    let bestDiscount: DiscountRecord | null = null;
    let bestDiscountCoin = 0;

    for (const discount of applicableDiscounts) {
        const discountCoin = calculateDiscountAmount(
            basePriceCoin,
            discount.discountType,
            discount.percentageOff,
            discount.fixedCoinOff
        );

        if (discountCoin > bestDiscountCoin) {
            bestDiscountCoin = discountCoin;
            bestDiscount = discount;
        }
    }

    return {
        basePriceCoin,
        discountCoin: bestDiscountCoin,
        finalPriceCoin: Math.max(0, basePriceCoin - bestDiscountCoin),
        appliedPromotion: bestDiscount ? toPromotionSummary(bestDiscount) : null,
    };
}

export function resolveCouponPricing(
    basePricing: StorePriceView,
    target: PromotionTargetContext,
    coupon: CouponRecord | null,
    now: Date
): CouponPricingResult {
    if (!coupon) {
        return { ok: false, reason: "Kupon bulunamadi." };
    }

    if (!coupon.isActive || !isWithinWindow(coupon.startsAt, coupon.endsAt, now)) {
        return { ok: false, reason: "Kupon aktif degil." };
    }

    if (!matchesTarget(coupon, target)) {
        return { ok: false, reason: "Kupon bu urun icin kullanilamaz." };
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        return { ok: false, reason: "Kupon kullanim limiti doldu." };
    }

    if (basePricing.appliedPromotion && !basePricing.appliedPromotion.stackableWithCoupon) {
        return { ok: false, reason: "Bu teklif kupon ile birlestirilemez." };
    }

    const couponDiscountCoin = calculateDiscountAmount(
        basePricing.finalPriceCoin,
        coupon.discountType,
        coupon.percentageOff,
        coupon.fixedCoinOff
    );

    return {
        ok: true,
        pricing: {
            ...basePricing,
            discountCoin: basePricing.discountCoin + couponDiscountCoin,
            finalPriceCoin: Math.max(0, basePricing.finalPriceCoin - couponDiscountCoin),
        },
        coupon: toCouponSummary(coupon),
        couponDiscountCoin,
    };
}

export function normalizeCouponCode(value: string): string {
    return value.trim().toUpperCase();
}
