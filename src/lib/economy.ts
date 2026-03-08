import { prisma } from "@/lib/prisma";
import { Prisma, ShopItemType } from "@prisma/client";
import type {
    DashboardDataResponse,
    EquippedSlots,
    InventoryItemView,
    StoreItemView,
    TemplateConfig,
    UserInventoryProfile,
    UserInventoryResponse,
} from "@/types/economy";

export const WIN_REWARD = 120;
export const LOSS_REWARD = 40;

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

function isEquipped(shopItemId: number, itemType: ShopItemType, equippedSlots: EquippedSlots): boolean {
    if (itemType === "avatar") return equippedSlots.avatarItemId === shopItemId;
    if (itemType === "frame") return equippedSlots.frameItemId === shopItemId;
    if (itemType === "card_back") return equippedSlots.cardBackItemId === shopItemId;
    return equippedSlots.cardFaceItemId === shopItemId;
}

function normalizeTemplateConfig(value: Prisma.JsonValue | null): TemplateConfig | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    const entries = Object.entries(value);
    const configEntries: [string, string | number | boolean][] = [];

    for (const [key, entryValue] of entries) {
        if (
            typeof entryValue === "string" ||
            typeof entryValue === "number" ||
            typeof entryValue === "boolean"
        ) {
            configEntries.push([key, entryValue]);
        }
    }

    return configEntries.length > 0 ? Object.fromEntries(configEntries) : null;
}

export async function getInventoryData(userId: number): Promise<UserInventoryResponse> {
    await ensureUserCore(userId);

    const [user, wallet, { profile, inventory }] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, role: true },
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
        role: user?.role ?? "user",
        wallet: {
            coinBalance: wallet?.coinBalance ?? 0,
        },
        profile: normalizedProfile,
        items,
    };
}

export async function listStoreItems(type?: ShopItemType, userId?: number): Promise<StoreItemView[]> {
    const loadItemsPromise = prisma.shopItem.findMany({
        where: {
            isActive: true,
            ...(type ? { type } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    if (!userId) {
        const items = await loadItemsPromise;
        return items.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            type: item.type,
            rarity: item.rarity,
            renderMode: item.renderMode,
            priceCoin: item.priceCoin,
            imageUrl: item.imageUrl,
            templateKey: item.templateKey,
            templateConfig: normalizeTemplateConfig(item.templateConfig),
            isActive: item.isActive,
            sortOrder: item.sortOrder,
            owned: false,
            equipped: false,
        }));
    }

    await ensureUserCore(userId);
    const [items, profile, inventory] = await Promise.all([
        loadItemsPromise,
        prisma.userProfile.findUnique({
            where: { userId },
            select: {
                avatarItemId: true,
                frameItemId: true,
                cardBackItemId: true,
                cardFaceItemId: true,
            },
        }),
        prisma.inventoryItem.findMany({
            where: { userId },
            select: { shopItemId: true },
        }),
    ]);

    const ownedIds = new Set(inventory.map((entry) => entry.shopItemId));
    const equippedSlots = getEquippedSlots(profile);

    return items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        renderMode: item.renderMode,
        priceCoin: item.priceCoin,
        imageUrl: item.imageUrl,
        templateKey: item.templateKey,
        templateConfig: normalizeTemplateConfig(item.templateConfig),
        isActive: item.isActive,
        sortOrder: item.sortOrder,
        owned: ownedIds.has(item.id),
        equipped: isEquipped(item.id, item.type, equippedSlots),
    }));
}

export async function purchaseStoreItem(userId: number, shopItemId: number) {
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

        const [item, wallet, owned] = await Promise.all([
            tx.shopItem.findUnique({ where: { id: shopItemId } }),
            tx.wallet.findUnique({ where: { userId } }),
            tx.inventoryItem.findUnique({
                where: {
                    userId_shopItemId: { userId, shopItemId },
                },
            }),
        ]);

        if (!item || !item.isActive) {
            return { ok: false as const, code: "not_found" as const };
        }
        if (owned) {
            return { ok: false as const, code: "already_owned" as const };
        }
        if (!wallet || wallet.coinBalance < item.priceCoin) {
            return { ok: false as const, code: "insufficient_balance" as const };
        }

        await tx.wallet.update({
            where: { userId },
            data: { coinBalance: { decrement: item.priceCoin } },
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
                priceCoin: item.priceCoin,
                status: "completed",
            },
        });

        const updatedWallet = await tx.wallet.findUnique({ where: { userId } });
        return {
            ok: true as const,
            item,
            coinBalance: updatedWallet?.coinBalance ?? 0,
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
