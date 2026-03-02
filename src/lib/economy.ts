import { prisma } from "@/lib/prisma";
import { Prisma, ShopItemType } from "@prisma/client";

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
        totalCoinEarned: matchStats._sum.coinEarned ?? 0,
        winRate: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0,
        recentMatches,
    };
}

export async function getProfileData(userId: number) {
    await ensureUserCore(userId);
    const profile = await prisma.userProfile.findUnique({
        where: { userId },
        include: {
            avatarItem: true,
            frameItem: true,
            cardBackItem: true,
        },
    });

    const inventory = await prisma.inventoryItem.findMany({
        where: { userId },
        include: { shopItem: true },
        orderBy: { acquiredAt: "desc" },
    });

    return { profile, inventory };
}

export async function listStoreItems(type?: ShopItemType) {
    return prisma.shopItem.findMany({
        where: {
            isActive: true,
            ...(type ? { type } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
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

    const profile = await prisma.userProfile.update({
        where: { userId },
        data,
        include: {
            avatarItem: true,
            frameItem: true,
            cardBackItem: true,
        },
    });

    return { ok: true as const, profile };
}
