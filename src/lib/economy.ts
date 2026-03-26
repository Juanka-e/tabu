import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { RoomCardCosmeticsSnapshot } from "@/lib/cosmetics/room-card-themes";
import { resolveFrameTheme } from "@/lib/cosmetics/frame";
import { normalizeTemplateConfig } from "@/lib/cosmetics/template-config";
import {
    normalizeCouponCode,
    resolveCatalogPricing,
    resolveCouponPricing,
} from "@/lib/store/pricing";
import {
    applyStorePriceMultiplier,
    getStoreLiveopsState,
} from "@/lib/system-settings/economy";
import { getSystemSettings } from "@/lib/system-settings/service";
import type { SystemSettings } from "@/types/system-settings";
import type {
    CatalogBundleView,
    CatalogStoreItemView,
    CouponPreviewResponse,
    DashboardDataResponse,
    EquippedSlots,
    InventoryItemView,
    PlayerAppearanceSnapshot,
    StoreItemType,
    StoreItemView,
    StoreCatalogResponse,
    StoreLiveopsView,
    UserInventoryProfile,
    UserInventoryResponse,
} from "@/types/economy";

type AppearanceProfileRecord = {
    userId: number;
    avatarItem: {
        imageUrl: string;
    } | null;
    frameItem: {
        imageUrl: string;
        rarity: "common" | "rare" | "epic" | "legendary";
        renderMode: "image" | "template";
        templateKey: string | null;
        templateConfig: Prisma.JsonValue | null;
    } | null;
};

type EquippedCardThemeItemRecord = {
    imageUrl: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    renderMode: "image" | "template";
    templateKey: string | null;
    templateConfig: Prisma.JsonValue | null;
};

type CardCosmeticsProfileRecord = {
    cardBackItem: EquippedCardThemeItemRecord | null;
    cardFaceItem: EquippedCardThemeItemRecord | null;
};

export async function ensureUserCore(userId: number) {
    await prisma.$transaction([
        prisma.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId, coinBalance: 0 },
        }),
        prisma.userProfile.upsert({
            where: { userId },
            update: {},
            create: { userId },
        }),
    ]);
}

export async function getDashboardData(userId: number) {
    await ensureUserCore(userId);

    const [wallet, matchStats, totalWins, recentMatches] = await Promise.all([
        prisma.wallet.findUnique({ where: { userId } }),
        prisma.matchResult.aggregate({
            where: { userId },
            _count: { _all: true },
            _sum: { coinEarned: true },
        }),
        prisma.matchResult.count({
            where: { userId, won: true },
        }),
        prisma.matchResult.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
        }),
    ]);

    const totalMatches = matchStats._count._all;

    return {
        coinBalance: wallet?.coinBalance ?? 0,
        totalMatches,
        totalWins,
        totalCoinEarned: matchStats._sum.coinEarned ?? 0,
        winRate: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0,
        recentMatches: recentMatches.map((match) => ({
            id: match.id,
            roomCode: match.roomCode,
            won: match.won,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            coinEarned: match.coinEarned,
            createdAt: match.createdAt.toISOString(),
        })),
    } satisfies DashboardDataResponse;
}

export async function getProfileData(userId: number) {
    await ensureUserCore(userId);
    const profile = await prisma.userProfile.findUnique({
        where: { userId },
        include: {
            avatarItem: true,
            frameItem: true,
            cardBackItem: true,
            cardFaceItem: true,
        },
    });

    const inventory = await prisma.inventoryItem.findMany({
        where: { userId },
        include: { shopItem: true },
        orderBy: { acquiredAt: "desc" },
    });

    return { profile, inventory };
}

export async function getPlayerAppearanceSnapshot(userId: number): Promise<PlayerAppearanceSnapshot> {
    await ensureUserCore(userId);

    const profile = await prisma.userProfile.findUnique({
        where: { userId },
        include: {
            avatarItem: {
                select: {
                    imageUrl: true,
                },
            },
            frameItem: {
                select: {
                    imageUrl: true,
                    rarity: true,
                    renderMode: true,
                    templateKey: true,
                    templateConfig: true,
                },
            },
        },
    });

    return profile ? mapPlayerAppearanceSnapshot(profile) : createEmptyAppearanceSnapshot();
}

export async function getPlayerAppearanceSnapshots(userIds: number[]): Promise<Map<number, PlayerAppearanceSnapshot>> {
    const uniqueUserIds = [...new Set(userIds.filter((userId) => Number.isInteger(userId) && userId > 0))];
    if (uniqueUserIds.length === 0) {
        return new Map();
    }

    await Promise.all(uniqueUserIds.map((userId) => ensureUserCore(userId)));

    const profiles = await prisma.userProfile.findMany({
        where: {
            userId: {
                in: uniqueUserIds,
            },
        },
        include: {
            avatarItem: {
                select: {
                    imageUrl: true,
                },
            },
            frameItem: {
                select: {
                    imageUrl: true,
                    rarity: true,
                    renderMode: true,
                    templateKey: true,
                    templateConfig: true,
                },
            },
        },
    });

    const profileMap = new Map<number, PlayerAppearanceSnapshot>();
    for (const profile of profiles) {
        profileMap.set(profile.userId, mapPlayerAppearanceSnapshot(profile));
    }

    return profileMap;
}

export async function getPlayerCardCosmeticsSnapshot(userId: number): Promise<RoomCardCosmeticsSnapshot> {
    await ensureUserCore(userId);

    const profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: {
            cardBackItem: {
                select: {
                    imageUrl: true,
                    rarity: true,
                    renderMode: true,
                    templateKey: true,
                    templateConfig: true,
                },
            },
            cardFaceItem: {
                select: {
                    imageUrl: true,
                    rarity: true,
                    renderMode: true,
                    templateKey: true,
                    templateConfig: true,
                },
            },
        },
    });

    return profile ? mapPlayerCardCosmeticsSnapshot(profile) : createEmptyPlayerCardCosmeticsSnapshot();
}

function getEquippedSlots(profile: {
    avatarItemId: number | null;
    frameItemId: number | null;
    cardBackItemId: number | null;
    cardFaceItemId: number | null;
} | null): EquippedSlots {
    return {
        avatarItemId: profile?.avatarItemId ?? null,
        frameItemId: profile?.frameItemId ?? null,
        cardBackItemId: profile?.cardBackItemId ?? null,
        cardFaceItemId: profile?.cardFaceItemId ?? null,
    };
}

function isEquipped(shopItemId: number, itemType: StoreItemType, equippedSlots: EquippedSlots): boolean {
    if (itemType === "avatar") return equippedSlots.avatarItemId === shopItemId;
    if (itemType === "frame") return equippedSlots.frameItemId === shopItemId;
    if (itemType === "card_back") return equippedSlots.cardBackItemId === shopItemId;
    return equippedSlots.cardFaceItemId === shopItemId;
}

function createEmptyAppearanceSnapshot(): PlayerAppearanceSnapshot {
    return {
        avatarImageUrl: null,
        frameImageUrl: null,
        frameAccentColor: null,
        frameSecondaryColor: null,
        framePattern: null,
        framePatternOpacity: null,
        framePatternScale: null,
        frameGlowColor: null,
        frameGlowBlur: null,
        frameGlowOpacity: null,
        frameStyle: null,
        frameThickness: null,
        frameRadius: null,
        frameMotionPreset: null,
        frameMotionSpeedMs: null,
    };
}

function createEmptyPlayerCardCosmeticsSnapshot(): RoomCardCosmeticsSnapshot {
    return {
        cardFace: null,
        cardBack: null,
    };
}

function mapPlayerAppearanceSnapshot(profile: AppearanceProfileRecord): PlayerAppearanceSnapshot {
    const frameTheme = profile.frameItem
        ? resolveFrameTheme({
            renderMode: profile.frameItem.renderMode,
            imageUrl: profile.frameItem.imageUrl,
            templateKey: profile.frameItem.templateKey,
            templateConfig: normalizeTemplateConfig(profile.frameItem.templateConfig),
            rarity: profile.frameItem.rarity,
        })
        : null;

    return {
        avatarImageUrl: profile.avatarItem?.imageUrl ?? null,
        frameImageUrl: frameTheme?.imageUrl ?? null,
        frameAccentColor: frameTheme?.accentColor ?? null,
        frameSecondaryColor: frameTheme?.secondaryColor ?? null,
        framePattern: frameTheme?.pattern ?? null,
        framePatternOpacity: frameTheme?.patternOpacity ?? null,
        framePatternScale: frameTheme?.patternScale ?? null,
        frameGlowColor: frameTheme?.glowColor ?? null,
        frameGlowBlur: frameTheme?.glowBlur ?? null,
        frameGlowOpacity: frameTheme?.glowOpacity ?? null,
        frameStyle: frameTheme?.frameStyle ?? null,
        frameThickness: frameTheme?.thickness ?? null,
        frameRadius: frameTheme?.radius ?? null,
        frameMotionPreset: frameTheme?.motionPreset ?? null,
        frameMotionSpeedMs: frameTheme?.motionSpeedMs ?? null,
    };
}

function mapPlayerCardCosmeticsSnapshot(profile: CardCosmeticsProfileRecord): RoomCardCosmeticsSnapshot {
    return {
        cardFace: profile.cardFaceItem
            ? {
                renderMode: profile.cardFaceItem.renderMode,
                imageUrl: profile.cardFaceItem.imageUrl,
                templateKey: profile.cardFaceItem.templateKey,
                templateConfig: normalizeTemplateConfig(profile.cardFaceItem.templateConfig),
                rarity: profile.cardFaceItem.rarity,
            }
            : null,
        cardBack: profile.cardBackItem
            ? {
                renderMode: profile.cardBackItem.renderMode,
                imageUrl: profile.cardBackItem.imageUrl,
                templateKey: profile.cardBackItem.templateKey,
                templateConfig: normalizeTemplateConfig(profile.cardBackItem.templateConfig),
                rarity: profile.cardBackItem.rarity,
            }
            : null,
    };
}

export async function getInventoryData(userId: number): Promise<UserInventoryResponse> {
    await ensureUserCore(userId);

    const [user, wallet, { profile, inventory }] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                emailVerifiedAt: true,
                role: true,
            },
        }),
        prisma.wallet.findUnique({ where: { userId } }),
        getProfileData(userId),
    ]);

    const equippedSlots = getEquippedSlots(profile);

    const items: InventoryItemView[] = inventory.map((entry) => ({
        inventoryItemId: entry.id,
        shopItemId: entry.shopItemId,
        code: entry.shopItem.code,
        name: entry.shopItem.name,
        type: entry.shopItem.type,
        rarity: entry.shopItem.rarity,
        renderMode: entry.shopItem.renderMode,
        priceCoin: entry.shopItem.priceCoin,
        imageUrl: entry.shopItem.imageUrl,
        templateKey: entry.shopItem.templateKey,
        templateConfig: normalizeTemplateConfig(entry.shopItem.templateConfig),
        badgeText: entry.shopItem.badgeText,
        isFeatured: entry.shopItem.isFeatured,
        source: entry.source,
        acquiredAt: entry.acquiredAt.toISOString(),
        equipped: isEquipped(entry.shopItemId, entry.shopItem.type, equippedSlots),
    }));

    const normalizedProfile: UserInventoryProfile = {
        displayName: profile?.displayName ?? null,
        bio: profile?.bio ?? null,
        avatarItemId: equippedSlots.avatarItemId,
        frameItemId: equippedSlots.frameItemId,
        cardBackItemId: equippedSlots.cardBackItemId,
        cardFaceItemId: equippedSlots.cardFaceItemId,
    };

    return {
        id: user?.id ?? userId,
        name: user?.username ?? "",
        email: user?.email ?? null,
        emailVerifiedAt: user?.emailVerifiedAt?.toISOString() ?? null,
        role: user?.role ?? "user",
        wallet: {
            coinBalance: wallet?.coinBalance ?? 0,
        },
        profile: normalizedProfile,
        items,
    };
}

type StoreCatalogItemRecord = Prisma.ShopItemGetPayload<{
    select: {
        id: true;
        code: true;
        name: true;
        type: true;
        rarity: true;
        renderMode: true;
        priceCoin: true;
        imageUrl: true;
        templateKey: true;
        templateConfig: true;
        badgeText: true;
        isFeatured: true;
        isActive: true;
        sortOrder: true;
        createdAt: true;
    };
}>;

type StoreCatalogBundleRecord = Prisma.ShopBundleGetPayload<{
    include: {
        items: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }];
            include: {
                shopItem: {
                    select: {
                        id: true;
                        code: true;
                        name: true;
                        type: true;
                        rarity: true;
                    };
                };
            };
        };
    };
}>;

type DiscountRecord = Prisma.DiscountCampaignGetPayload<{
    select: {
        id: true;
        code: true;
        name: true;
        description: true;
        targetType: true;
        discountType: true;
        percentageOff: true;
        fixedCoinOff: true;
        shopItemId: true;
        bundleId: true;
        usageLimit: true;
        usedCount: true;
        startsAt: true;
        endsAt: true;
        isActive: true;
        stackableWithCoupon: true;
    };
}>;

type CouponRecord = Prisma.CouponCodeGetPayload<{
    select: {
        id: true;
        code: true;
        name: true;
        description: true;
        targetType: true;
        discountType: true;
        percentageOff: true;
        fixedCoinOff: true;
        shopItemId: true;
        bundleId: true;
        usageLimit: true;
        usedCount: true;
        startsAt: true;
        endsAt: true;
        isActive: true;
    };
}>;

type PurchaseItemResult =
    | { ok: true; item: StoreCatalogItemRecord; coinBalance: number; finalPriceCoin: number }
    | { ok: false; code: "not_found" | "already_owned" | "insufficient_balance" | "invalid_coupon" | "promotion_unavailable" | "coupon_disabled" };

type PurchaseBundleResult =
    | {
        ok: true;
        bundle: StoreCatalogBundleRecord;
        awardedItems: StoreCatalogItemRecord[];
        coinBalance: number;
        finalPriceCoin: number;
    }
    | {
        ok: false;
        code:
        | "not_found"
        | "already_owned"
        | "contains_owned_items"
        | "insufficient_balance"
        | "invalid_coupon"
        | "promotion_unavailable"
        | "bundle_disabled"
        | "coupon_disabled";
    };

function mapStoreItemView(
    item: StoreCatalogItemRecord,
    ownedIds: Set<number>,
    equippedSlots: EquippedSlots,
    settings: SystemSettings
): StoreItemView {
    const effectivePriceCoin = applyStorePriceMultiplier(item.priceCoin, settings);

    return {
        id: item.id,
        code: item.code,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        renderMode: item.renderMode,
        priceCoin: effectivePriceCoin,
        imageUrl: item.imageUrl,
        templateKey: item.templateKey,
        templateConfig: normalizeTemplateConfig(item.templateConfig),
        badgeText: item.badgeText,
        isFeatured: item.isFeatured,
        isActive: item.isActive,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt.toISOString(),
        owned: ownedIds.has(item.id),
        equipped: isEquipped(item.id, item.type, equippedSlots),
    };
}

function mapCatalogItemView(
    item: StoreCatalogItemRecord,
    ownedIds: Set<number>,
    equippedSlots: EquippedSlots,
    discounts: DiscountRecord[],
    now: Date,
    settings: SystemSettings
): CatalogStoreItemView {
    const effectivePriceCoin = applyStorePriceMultiplier(item.priceCoin, settings);
    const baseView = mapStoreItemView(item, ownedIds, equippedSlots, settings);

    return {
        ...baseView,
        pricing: resolveCatalogPricing(
            effectivePriceCoin,
            { kind: "shop_item", targetId: item.id },
            discounts,
            now
        ),
    };
}

function mapCatalogBundleView(
    bundle: StoreCatalogBundleRecord,
    ownedIds: Set<number>,
    discounts: DiscountRecord[],
    now: Date,
    settings: SystemSettings
): CatalogBundleView {
    const ownedItemCount = bundle.items.filter((entry) => ownedIds.has(entry.shopItemId)).length;
    const effectivePriceCoin = applyStorePriceMultiplier(bundle.priceCoin, settings);

    return {
        id: bundle.id,
        code: bundle.code,
        name: bundle.name,
        description: bundle.description,
        priceCoin: effectivePriceCoin,
        isActive: bundle.isActive,
        sortOrder: bundle.sortOrder,
        createdAt: bundle.createdAt.toISOString(),
        ownedItemCount,
        fullyOwned: ownedItemCount === bundle.items.length && bundle.items.length > 0,
        pricing: resolveCatalogPricing(
            effectivePriceCoin,
            { kind: "bundle", targetId: bundle.id },
            discounts,
            now
        ),
        items: bundle.items.map((entry) => ({
            id: entry.id,
            shopItemId: entry.shopItemId,
            sortOrder: entry.sortOrder,
            itemCode: entry.shopItem.code,
            itemName: entry.shopItem.name,
            itemType: entry.shopItem.type,
            itemRarity: entry.shopItem.rarity,
        })),
    };
}

async function loadStoreContext(settings: SystemSettings, userId?: number) {
    if (userId) {
        await ensureUserCore(userId);
    }

    const [
        items,
        bundles,
        discounts,
        wallet,
        profile,
        inventory,
    ] = await Promise.all([
        prisma.shopItem.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
                code: true,
                name: true,
                type: true,
                rarity: true,
                renderMode: true,
                priceCoin: true,
                imageUrl: true,
                templateKey: true,
                templateConfig: true,
                badgeText: true,
                isFeatured: true,
                isActive: true,
                sortOrder: true,
                createdAt: true,
            },
        }),
        settings.economy.bundlesEnabled
            ? prisma.shopBundle.findMany({
                where: { isActive: true },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                include: {
                    items: {
                        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                        include: {
                            shopItem: {
                                select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                    type: true,
                                    rarity: true,
                                },
                            },
                        },
                    },
                },
            })
            : Promise.resolve([]),
        settings.economy.discountCampaignsEnabled
            ? prisma.discountCampaign.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    targetType: true,
                    discountType: true,
                    percentageOff: true,
                    fixedCoinOff: true,
                    shopItemId: true,
                    bundleId: true,
                    usageLimit: true,
                    usedCount: true,
                    startsAt: true,
                    endsAt: true,
                    isActive: true,
                    stackableWithCoupon: true,
                },
            })
            : Promise.resolve([]),
        userId
            ? prisma.wallet.findUnique({ where: { userId } })
            : Promise.resolve(null),
        userId
            ? prisma.userProfile.findUnique({
                where: { userId },
                select: {
                    avatarItemId: true,
                    frameItemId: true,
                    cardBackItemId: true,
                    cardFaceItemId: true,
                },
            })
            : Promise.resolve(null),
        userId
            ? prisma.inventoryItem.findMany({
                where: { userId },
                select: { shopItemId: true },
            })
            : Promise.resolve([]),
    ]);

    return {
        items,
        bundles,
        discounts,
        wallet,
        profile,
        inventory,
    };
}

async function loadCouponRecord(
    tx: Prisma.TransactionClient,
    couponCode: string | undefined
): Promise<CouponRecord | null> {
    if (!couponCode) {
        return null;
    }

    return tx.couponCode.findUnique({
        where: { code: normalizeCouponCode(couponCode) },
        select: {
            id: true,
            code: true,
            name: true,
            description: true,
            targetType: true,
            discountType: true,
            percentageOff: true,
            fixedCoinOff: true,
            shopItemId: true,
            bundleId: true,
            usageLimit: true,
            usedCount: true,
            startsAt: true,
            endsAt: true,
            isActive: true,
        },
    });
}

async function reserveDiscountCampaignUsage(
    tx: Prisma.TransactionClient,
    promotionId: number
): Promise<boolean> {
    const result = await tx.discountCampaign.updateMany({
        where: {
            id: promotionId,
            OR: [
                { usageLimit: null },
                {
                    AND: [
                        { usageLimit: { not: null } },
                        { usedCount: { lt: tx.discountCampaign.fields.usageLimit } },
                    ],
                },
            ],
        },
        data: {
            usedCount: { increment: 1 },
        },
    });

    return result.count === 1;
}

async function reserveCouponUsage(
    tx: Prisma.TransactionClient,
    couponId: number
): Promise<boolean> {
    const result = await tx.couponCode.updateMany({
        where: {
            id: couponId,
            OR: [
                { usageLimit: null },
                {
                    AND: [
                        { usageLimit: { not: null } },
                        { usedCount: { lt: tx.couponCode.fields.usageLimit } },
                    ],
                },
            ],
        },
        data: {
            usedCount: { increment: 1 },
        },
    });

    return result.count === 1;
}

export async function listStoreItems(type?: StoreItemType, userId?: number): Promise<StoreItemView[]> {
    const catalog = await getStoreCatalog(userId);
    const items = type
        ? catalog.items.filter((item) => item.type === type)
        : catalog.items;

    return items.map((item) => {
        const { pricing, ...itemView } = item;
        void pricing;
        return itemView;
    });
}

export async function getStoreCatalog(
    userId?: number,
    settingsInput?: SystemSettings
): Promise<StoreCatalogResponse> {
    const settings = settingsInput ?? await getSystemSettings();
    const { items, bundles, discounts, wallet, profile, inventory } = await loadStoreContext(settings, userId);
    const now = new Date();
    const ownedIds = new Set(inventory.map((entry) => entry.shopItemId));
    const equippedSlots = getEquippedSlots(profile);

    return {
        coinBalance: wallet?.coinBalance ?? 0,
        items: items.map((item) => mapCatalogItemView(item, ownedIds, equippedSlots, discounts, now, settings)),
        bundles: bundles.map((bundle) => mapCatalogBundleView(bundle, ownedIds, discounts, now, settings)),
        liveops: getStoreLiveopsState(settings, now) satisfies StoreLiveopsView,
    };
}

export async function previewCouponForTarget(
    userId: number,
    targetKind: "shop_item" | "bundle",
    targetId: number,
    couponCode: string,
    settingsInput?: SystemSettings
): Promise<CouponPreviewResponse> {
    await ensureUserCore(userId);
    const settings = settingsInput ?? await getSystemSettings();

    const normalizedCode = normalizeCouponCode(couponCode);
    if (!normalizedCode) {
        return {
            valid: false,
            reason: "Kupon kodu bos olamaz.",
            targetKind,
            targetId,
            pricing: null,
            coupon: null,
        };
    }

    if (!settings.economy.couponsEnabled) {
        return {
            valid: false,
            reason: "Kupon kullanimi su anda gecici olarak kapali.",
            targetKind,
            targetId,
            pricing: null,
            coupon: null,
        };
    }

    if (targetKind === "bundle" && !settings.economy.bundlesEnabled) {
        return {
            valid: false,
            reason: "Bundle satislari su anda gecici olarak kapali.",
            targetKind,
            targetId,
            pricing: null,
            coupon: null,
        };
    }

    const now = new Date();
    const [discounts, coupon, item, bundle] = await Promise.all([
        settings.economy.discountCampaignsEnabled
            ? prisma.discountCampaign.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    targetType: true,
                    discountType: true,
                    percentageOff: true,
                    fixedCoinOff: true,
                    shopItemId: true,
                    bundleId: true,
                    usageLimit: true,
                    usedCount: true,
                    startsAt: true,
                    endsAt: true,
                    isActive: true,
                    stackableWithCoupon: true,
                },
            })
            : Promise.resolve([]),
        prisma.couponCode.findUnique({
            where: { code: normalizedCode },
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
                targetType: true,
                discountType: true,
                percentageOff: true,
                fixedCoinOff: true,
                shopItemId: true,
                bundleId: true,
                usageLimit: true,
                usedCount: true,
                startsAt: true,
                endsAt: true,
                isActive: true,
            },
        }),
        targetKind === "shop_item"
            ? prisma.shopItem.findUnique({
                where: { id: targetId },
                select: { id: true, priceCoin: true, isActive: true },
            })
            : Promise.resolve(null),
        targetKind === "bundle"
            ? prisma.shopBundle.findUnique({
                where: { id: targetId },
                select: { id: true, priceCoin: true, isActive: true },
            })
            : Promise.resolve(null),
    ]);

    const basePriceCoin = targetKind === "shop_item" ? item?.priceCoin : bundle?.priceCoin;
    const isActiveTarget = targetKind === "shop_item" ? item?.isActive : bundle?.isActive;

    if (basePriceCoin === undefined || basePriceCoin === null || !isActiveTarget) {
        return {
            valid: false,
            reason: "Hedef urun bulunamadi.",
            targetKind,
            targetId,
            pricing: null,
            coupon: null,
        };
    }

    const effectivePriceCoin = applyStorePriceMultiplier(basePriceCoin, settings);

    const basePricing = resolveCatalogPricing(
        effectivePriceCoin,
        { kind: targetKind, targetId },
        discounts,
        now
    );
    const couponResult = resolveCouponPricing(basePricing, { kind: targetKind, targetId }, coupon, now);

    if (!couponResult.ok) {
        return {
            valid: false,
            reason: couponResult.reason,
            targetKind,
            targetId,
            pricing: basePricing,
            coupon: null,
        };
    }

    return {
        valid: true,
        reason: null,
        targetKind,
        targetId,
        pricing: couponResult.pricing,
        coupon: couponResult.coupon,
    };
}

export async function purchaseStoreItem(
    userId: number,
    shopItemId: number,
    couponCode?: string,
    settingsInput?: SystemSettings
): Promise<PurchaseItemResult> {
    const settings = settingsInput ?? await getSystemSettings();

    return prisma.$transaction(async (tx) => {
        await tx.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId, coinBalance: 0 },
        });
        await tx.userProfile.upsert({
            where: { userId },
            update: {},
            create: { userId },
        });

        const now = new Date();
        const normalizedCouponCode = couponCode ? normalizeCouponCode(couponCode) : "";

        const [item, wallet, owned, discounts, coupon] = await Promise.all([
            tx.shopItem.findUnique({
                where: { id: shopItemId },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    type: true,
                    rarity: true,
                    renderMode: true,
                    priceCoin: true,
                    imageUrl: true,
                    templateKey: true,
                    templateConfig: true,
                    badgeText: true,
                    isFeatured: true,
                    isActive: true,
                    sortOrder: true,
                    createdAt: true,
                },
            }),
            tx.wallet.findUnique({ where: { userId } }),
            tx.inventoryItem.findUnique({
                where: {
                    userId_shopItemId: { userId, shopItemId },
                },
            }),
            settings.economy.discountCampaignsEnabled
                ? tx.discountCampaign.findMany({
                    where: { isActive: true },
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        targetType: true,
                        discountType: true,
                        percentageOff: true,
                        fixedCoinOff: true,
                        shopItemId: true,
                        bundleId: true,
                        usageLimit: true,
                        usedCount: true,
                        startsAt: true,
                        endsAt: true,
                        isActive: true,
                        stackableWithCoupon: true,
                    },
                })
                : Promise.resolve([]),
            settings.economy.couponsEnabled
                ? loadCouponRecord(tx, normalizedCouponCode || undefined)
                : Promise.resolve(null),
        ]);

        if (!item || !item.isActive) {
            return { ok: false, code: "not_found" };
        }
        if (owned) {
            return { ok: false, code: "already_owned" };
        }
        if (normalizedCouponCode && !settings.economy.couponsEnabled) {
            return { ok: false, code: "coupon_disabled" };
        }

        const effectivePriceCoin = applyStorePriceMultiplier(item.priceCoin, settings);

        const catalogPricing = resolveCatalogPricing(
            effectivePriceCoin,
            { kind: "shop_item", targetId: item.id },
            discounts,
            now
        );

        const resolvedPricing = normalizedCouponCode
            ? resolveCouponPricing(catalogPricing, { kind: "shop_item", targetId: item.id }, coupon, now)
            : null;

        if (resolvedPricing && !resolvedPricing.ok) {
            return { ok: false, code: "invalid_coupon" };
        }

        const finalPriceCoin = resolvedPricing?.ok ? resolvedPricing.pricing.finalPriceCoin : catalogPricing.finalPriceCoin;
        if (!wallet || wallet.coinBalance < finalPriceCoin) {
            return { ok: false, code: "insufficient_balance" };
        }

        if (catalogPricing.appliedPromotion) {
            const reservedPromotion = await reserveDiscountCampaignUsage(tx, catalogPricing.appliedPromotion.id);
            if (!reservedPromotion) {
                return { ok: false, code: "promotion_unavailable" };
            }
        }

        if (resolvedPricing?.ok && coupon) {
            const reservedCoupon = await reserveCouponUsage(tx, coupon.id);
            if (!reservedCoupon) {
                return { ok: false, code: "invalid_coupon" };
            }
        }

        await tx.wallet.update({
            where: { userId },
            data: { coinBalance: { decrement: finalPriceCoin } },
        });

        await tx.inventoryItem.create({
            data: {
                userId,
                shopItemId,
                source: "purchase",
            },
        });

        await tx.purchase.create({
            data: {
                userId,
                shopItemId,
                couponCodeId: resolvedPricing?.ok ? coupon?.id ?? null : null,
                priceCoin: finalPriceCoin,
                listPriceCoin: effectivePriceCoin,
                discountCoin: effectivePriceCoin - finalPriceCoin,
                status: "completed",
            },
        });

        const updatedWallet = await tx.wallet.findUnique({ where: { userId } });
        return {
            ok: true,
            item,
            coinBalance: updatedWallet?.coinBalance ?? 0,
            finalPriceCoin,
        };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

export async function purchaseStoreBundle(
    userId: number,
    bundleId: number,
    couponCode?: string,
    settingsInput?: SystemSettings
): Promise<PurchaseBundleResult> {
    const settings = settingsInput ?? await getSystemSettings();

    return prisma.$transaction(async (tx) => {
        await tx.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId, coinBalance: 0 },
        });
        await tx.userProfile.upsert({
            where: { userId },
            update: {},
            create: { userId },
        });

        const now = new Date();
        const normalizedCouponCode = couponCode ? normalizeCouponCode(couponCode) : "";

        const [bundle, wallet, inventory, discounts, coupon] = await Promise.all([
            tx.shopBundle.findUnique({
                where: { id: bundleId },
                include: {
                    items: {
                        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                        include: {
                            shopItem: {
                                select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                    type: true,
                                    rarity: true,
                                    renderMode: true,
                                    priceCoin: true,
                                    imageUrl: true,
                                    templateKey: true,
                                    templateConfig: true,
                                    badgeText: true,
                                    isFeatured: true,
                                    isActive: true,
                                    sortOrder: true,
                                    createdAt: true,
                                },
                            },
                        },
                    },
                },
            }),
            tx.wallet.findUnique({ where: { userId } }),
            tx.inventoryItem.findMany({
                where: { userId },
                select: { shopItemId: true },
            }),
            settings.economy.discountCampaignsEnabled
                ? tx.discountCampaign.findMany({
                    where: { isActive: true },
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        targetType: true,
                        discountType: true,
                        percentageOff: true,
                        fixedCoinOff: true,
                        shopItemId: true,
                        bundleId: true,
                        usageLimit: true,
                        usedCount: true,
                        startsAt: true,
                        endsAt: true,
                        isActive: true,
                        stackableWithCoupon: true,
                    },
                })
                : Promise.resolve([]),
            settings.economy.couponsEnabled
                ? loadCouponRecord(tx, normalizedCouponCode || undefined)
                : Promise.resolve(null),
        ]);

        if (!bundle || !bundle.isActive) {
            return { ok: false, code: "not_found" };
        }
        if (!settings.economy.bundlesEnabled) {
            return { ok: false, code: "bundle_disabled" };
        }
        if (normalizedCouponCode && !settings.economy.couponsEnabled) {
            return { ok: false, code: "coupon_disabled" };
        }

        const ownedIds = new Set(inventory.map((entry) => entry.shopItemId));
        const awardedEntries = bundle.items.filter((entry) => !ownedIds.has(entry.shopItemId));

        if (awardedEntries.length === 0) {
            return { ok: false, code: "already_owned" };
        }

        if (awardedEntries.length !== bundle.items.length) {
            return { ok: false, code: "contains_owned_items" };
        }

        const effectivePriceCoin = applyStorePriceMultiplier(bundle.priceCoin, settings);

        const catalogPricing = resolveCatalogPricing(
            effectivePriceCoin,
            { kind: "bundle", targetId: bundle.id },
            discounts,
            now
        );

        const resolvedPricing = normalizedCouponCode
            ? resolveCouponPricing(catalogPricing, { kind: "bundle", targetId: bundle.id }, coupon, now)
            : null;

        if (resolvedPricing && !resolvedPricing.ok) {
            return { ok: false, code: "invalid_coupon" };
        }

        const finalPriceCoin = resolvedPricing?.ok ? resolvedPricing.pricing.finalPriceCoin : catalogPricing.finalPriceCoin;
        if (!wallet || wallet.coinBalance < finalPriceCoin) {
            return { ok: false, code: "insufficient_balance" };
        }

        if (catalogPricing.appliedPromotion) {
            const reservedPromotion = await reserveDiscountCampaignUsage(tx, catalogPricing.appliedPromotion.id);
            if (!reservedPromotion) {
                return { ok: false, code: "promotion_unavailable" };
            }
        }

        if (resolvedPricing?.ok && coupon) {
            const reservedCoupon = await reserveCouponUsage(tx, coupon.id);
            if (!reservedCoupon) {
                return { ok: false, code: "invalid_coupon" };
            }
        }

        await tx.wallet.update({
            where: { userId },
            data: { coinBalance: { decrement: finalPriceCoin } },
        });

        await tx.inventoryItem.createMany({
            data: awardedEntries.map((entry) => ({
                userId,
                shopItemId: entry.shopItemId,
                source: "purchase",
            })),
        });

        await tx.purchase.create({
            data: {
                userId,
                bundleId: bundle.id,
                couponCodeId: resolvedPricing?.ok ? coupon?.id ?? null : null,
                priceCoin: finalPriceCoin,
                listPriceCoin: effectivePriceCoin,
                discountCoin: effectivePriceCoin - finalPriceCoin,
                status: "completed",
            },
        });

        const updatedWallet = await tx.wallet.findUnique({ where: { userId } });
        return {
            ok: true,
            bundle,
            awardedItems: awardedEntries.map((entry) => entry.shopItem),
            coinBalance: updatedWallet?.coinBalance ?? 0,
            finalPriceCoin,
        };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

export async function equipStoreItem(userId: number, shopItemId: number) {
    await ensureUserCore(userId);
    const [item, owned] = await Promise.all([
        prisma.shopItem.findUnique({ where: { id: shopItemId } }),
        prisma.inventoryItem.findUnique({
            where: { userId_shopItemId: { userId, shopItemId } },
        }),
    ]);

    if (!item) return { ok: false as const, code: "not_found" as const };
    if (!owned) return { ok: false as const, code: "not_owned" as const };

    const data: Record<string, number> = {};
    if (item.type === "avatar") data.avatarItemId = item.id;
    if (item.type === "frame") data.frameItemId = item.id;
    if (item.type === "card_back") data.cardBackItemId = item.id;
    if (item.type === "card_face") data.cardFaceItemId = item.id;

    const profile = await prisma.userProfile.update({
        where: { userId },
        data,
        include: {
            avatarItem: true,
            frameItem: true,
            cardBackItem: true,
            cardFaceItem: true,
        },
    });

    return { ok: true as const, profile };
}
