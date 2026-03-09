export type StoreItemType = "avatar" | "frame" | "card_back" | "card_face";
export type StoreItemRarity = "common" | "rare" | "epic" | "legendary";
export type InventoryItemSource = "purchase" | "grant" | "migration";
export type StoreItemRenderMode = "image" | "template";
export type TemplateConfigScalar = string | number | boolean | null;
export type TemplateConfigArray = TemplateConfigScalar[];
export interface TemplateConfigObject {
    [key: string]: TemplateConfigValue;
}
export type TemplateConfigValue = TemplateConfigScalar | TemplateConfigArray | TemplateConfigObject;
export type TemplateConfig = TemplateConfigObject;
export type CosmeticPattern =
    | "none"
    | "grid"
    | "dots"
    | "diagonal"
    | "chevrons"
    | "rings"
    | "noise";
export type CosmeticMotionPreset = "none" | "pulse" | "drift" | "shimmer";
export type CosmeticFrameStyle = "solid" | "double" | "ornate";
export type PromotionTargetType = "global" | "shop_item" | "bundle";
export type PromotionDiscountType = "percentage" | "fixed_coin";

export interface EquippedSlots {
    avatarItemId: number | null;
    frameItemId: number | null;
    cardBackItemId: number | null;
    cardFaceItemId: number | null;
}

export interface StoreItemView {
    id: number;
    code: string;
    name: string;
    type: StoreItemType;
    rarity: StoreItemRarity;
    renderMode: StoreItemRenderMode;
    priceCoin: number;
    imageUrl: string;
    templateKey: string | null;
    templateConfig: TemplateConfig | null;
    badgeText: string | null;
    isFeatured: boolean;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    owned: boolean;
    equipped: boolean;
}

export interface PromotionSummaryView {
    id: number;
    code: string;
    name: string;
    description: string | null;
    discountType: PromotionDiscountType;
    percentageOff: number | null;
    fixedCoinOff: number | null;
    stackableWithCoupon: boolean;
    usageLimit: number | null;
    usedCount: number;
}

export interface StorePriceView {
    basePriceCoin: number;
    discountCoin: number;
    finalPriceCoin: number;
    appliedPromotion: PromotionSummaryView | null;
}

export interface CatalogStoreItemView extends StoreItemView {
    pricing: StorePriceView;
}

export interface InventoryItemView {
    inventoryItemId: number;
    shopItemId: number;
    code: string;
    name: string;
    type: StoreItemType;
    rarity: StoreItemRarity;
    renderMode: StoreItemRenderMode;
    priceCoin: number;
    imageUrl: string;
    templateKey: string | null;
    templateConfig: TemplateConfig | null;
    badgeText: string | null;
    isFeatured: boolean;
    source: InventoryItemSource;
    acquiredAt: string;
    equipped: boolean;
}

export interface UserInventoryProfile {
    displayName: string | null;
    bio: string | null;
    avatarItemId: number | null;
    frameItemId: number | null;
    cardBackItemId: number | null;
    cardFaceItemId: number | null;
}

export interface UserInventoryResponse {
    id: number;
    name: string;
    role: string;
    wallet: {
        coinBalance: number;
    };
    profile: UserInventoryProfile;
    items: InventoryItemView[];
}

export interface DashboardMatchView {
    id: number;
    roomCode: string;
    won: boolean;
    scoreA: number;
    scoreB: number;
    coinEarned: number;
    createdAt: string;
}

export interface DashboardDataResponse {
    coinBalance: number;
    totalMatches: number;
    totalWins: number;
    totalCoinEarned: number;
    winRate: number;
    recentMatches: DashboardMatchView[];
}

export interface PlayerAppearanceSnapshot {
    avatarImageUrl: string | null;
    frameImageUrl: string | null;
    frameAccentColor: string | null;
    frameSecondaryColor: string | null;
    framePattern: CosmeticPattern | null;
    framePatternOpacity: number | null;
    framePatternScale: number | null;
    frameGlowColor: string | null;
    frameGlowBlur: number | null;
    frameGlowOpacity: number | null;
    frameStyle: CosmeticFrameStyle | null;
    frameThickness: number | null;
    frameRadius: number | null;
    frameMotionPreset: CosmeticMotionPreset | null;
    frameMotionSpeedMs: number | null;
}

export interface ShopBundleItemView {
    id: number;
    shopItemId: number;
    sortOrder: number;
    itemCode: string;
    itemName: string;
    itemType: StoreItemType;
    itemRarity: StoreItemRarity;
}

export interface ShopBundleView {
    id: number;
    code: string;
    name: string;
    description: string | null;
    priceCoin: number;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    items: ShopBundleItemView[];
}

export interface CatalogBundleView extends ShopBundleView {
    ownedItemCount: number;
    fullyOwned: boolean;
    pricing: StorePriceView;
}

export interface DiscountCampaignView {
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
    usageLimit: number | null;
    usedCount: number;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
    stackableWithCoupon: boolean;
    createdAt: string;
}

export interface CouponCodeView {
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
    usageLimit: number | null;
    usedCount: number;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
    createdAt: string;
}

export interface CouponPreviewView {
    code: string;
    name: string;
    description: string | null;
    discountType: PromotionDiscountType;
    percentageOff: number | null;
    fixedCoinOff: number | null;
}

export interface CouponPreviewResponse {
    valid: boolean;
    reason: string | null;
    targetKind: "shop_item" | "bundle";
    targetId: number;
    pricing: StorePriceView | null;
    coupon: CouponPreviewView | null;
}

export interface StoreCatalogResponse {
    coinBalance: number;
    items: CatalogStoreItemView[];
    bundles: CatalogBundleView[];
}
