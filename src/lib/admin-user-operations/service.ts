import { prisma } from "@/lib/prisma";
import type { AdminSession } from "@/lib/admin/require-admin";
import type { WalletAdjustmentInput } from "@/lib/admin-user-operations/schema";
import type { AdminWalletAdjustmentView } from "@/types/admin-user-operations";

export function resolveWalletBalanceAfter(input: {
    adjustmentType: "credit" | "debit";
    amount: number;
    balanceBefore: number;
}): number {
    const delta = input.adjustmentType === "credit" ? input.amount : -input.amount;
    return input.balanceBefore + delta;
}

function mapWalletAdjustment(adjustment: {
    id: number;
    adjustmentType: "credit" | "debit";
    amount: number;
    reason: string;
    balanceBefore: number;
    balanceAfter: number;
    createdAt: Date;
    actorUser: { id: number; username: string; role: string } | null;
}): AdminWalletAdjustmentView {
    return {
        id: adjustment.id,
        adjustmentType: adjustment.adjustmentType,
        amount: adjustment.amount,
        reason: adjustment.reason,
        balanceBefore: adjustment.balanceBefore,
        balanceAfter: adjustment.balanceAfter,
        createdAt: adjustment.createdAt.toISOString(),
        actor: adjustment.actorUser
            ? {
                  id: adjustment.actorUser.id,
                  username: adjustment.actorUser.username,
                  role: adjustment.actorUser.role,
              }
            : null,
    };
}

export async function applyAdminWalletAdjustment(input: {
    admin: AdminSession;
    targetUserId: number;
    adjustment: WalletAdjustmentInput;
}): Promise<
    | { ok: true; adjustment: AdminWalletAdjustmentView; coinBalance: number; targetUsername: string }
    | { ok: false; code: "not_found" | "target_is_admin" | "insufficient_balance" }
> {
    const { admin, targetUserId, adjustment } = input;

    if (admin.id === targetUserId) {
        return { ok: false, code: "target_is_admin" };
    }

    return prisma.$transaction(async (tx) => {
        await tx.wallet.upsert({
            where: { userId: targetUserId },
            update: {},
            create: { userId: targetUserId, coinBalance: 0 },
        });

        const targetUser = await tx.user.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                username: true,
                role: true,
                wallet: {
                    select: {
                        coinBalance: true,
                    },
                },
            },
        });

        if (!targetUser) {
            return { ok: false, code: "not_found" } as const;
        }

        if (targetUser.role === "admin") {
            return { ok: false, code: "target_is_admin" } as const;
        }

        const balanceBefore = targetUser.wallet?.coinBalance ?? 0;
        const balanceAfter = resolveWalletBalanceAfter({
            adjustmentType: adjustment.adjustmentType,
            amount: adjustment.amount,
            balanceBefore,
        });

        if (balanceAfter < 0) {
            return { ok: false, code: "insufficient_balance" } as const;
        }

        const updatedWallet = await tx.wallet.update({
            where: { userId: targetUserId },
            data: {
                coinBalance: balanceAfter,
            },
            select: {
                coinBalance: true,
            },
        });

        const createdAdjustment = await tx.walletAdjustment.create({
            data: {
                targetUserId,
                actorUserId: admin.id,
                adjustmentType: adjustment.adjustmentType,
                amount: adjustment.amount,
                reason: adjustment.reason,
                balanceBefore,
                balanceAfter,
            },
            include: {
                actorUser: {
                    select: {
                        id: true,
                        username: true,
                        role: true,
                    },
                },
            },
        });

        return {
            ok: true as const,
            adjustment: mapWalletAdjustment(createdAdjustment),
            coinBalance: updatedWallet.coinBalance,
            targetUsername: targetUser.username,
        };
    });
}
