import { Prisma, type WalletLedgerSource } from "@hushle/platform-db";

const MAX_COIN_BALANCE = 2_147_483_647;

type TransactionClient = Prisma.TransactionClient;

type LockedWallet = {
    id: number;
    userId: number;
    coinBalance: number;
};

export type WalletLedgerMutationResult = {
    ledgerEntryId: number;
    walletId: number;
    balanceBefore: number;
    balanceAfter: number;
    duplicate: boolean;
};

export class WalletLedgerInsufficientBalanceError extends Error {
    constructor() {
        super("Wallet balance is insufficient for this operation.");
        this.name = "WalletLedgerInsufficientBalanceError";
    }
}

function assertCoinInteger(value: number, field: string): void {
    if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_COIN_BALANCE) {
        throw new RangeError(`${field} must be a safe 32-bit coin integer.`);
    }
}

export function resolveWalletBalanceAfterDelta(balanceBefore: number, deltaCoin: number): number {
    assertCoinInteger(balanceBefore, "balanceBefore");
    assertCoinInteger(deltaCoin, "deltaCoin");

    const balanceAfter = balanceBefore + deltaCoin;
    if (!Number.isSafeInteger(balanceAfter) || balanceAfter > MAX_COIN_BALANCE) {
        throw new RangeError("Wallet balance exceeds the supported coin range.");
    }
    if (balanceAfter < 0) {
        throw new WalletLedgerInsufficientBalanceError();
    }
    return balanceAfter;
}

async function lockWallet(tx: TransactionClient, userId: number): Promise<LockedWallet> {
    await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, coinBalance: 0 },
    });

    const rows = await tx.$queryRaw<LockedWallet[]>(Prisma.sql`
        SELECT
            id,
            user_id AS userId,
            coin_balance AS coinBalance
        FROM wallets
        WHERE user_id = ${userId}
        FOR UPDATE
    `);
    const wallet = rows[0];
    if (!wallet) {
        throw new Error(`Wallet lock failed for user ${userId}.`);
    }
    return wallet;
}

async function ensureWalletLedgerBaseline(
    tx: TransactionClient,
    wallet: LockedWallet,
    source: Extract<WalletLedgerSource, "legacy_balance_snapshot" | "account_opening"> = "legacy_balance_snapshot"
) {
    assertCoinInteger(wallet.coinBalance, "wallet.coinBalance");
    if (wallet.coinBalance < 0) {
        throw new Error("Existing wallet balance cannot be negative.");
    }

    const existing = await tx.walletLedgerEntry.findFirst({
        where: { walletId: wallet.id },
        orderBy: { id: "asc" },
        select: { id: true },
    });
    if (existing) {
        return existing;
    }

    return tx.walletLedgerEntry.create({
        data: {
            walletId: wallet.id,
            source,
            deltaCoin: wallet.coinBalance,
            balanceBefore: 0,
            balanceAfter: wallet.coinBalance,
            idempotencyKey: `wallet:${wallet.id}:opening`,
            referenceType: source === "account_opening" ? "user_registration" : "wallet_migration",
            referenceId: String(wallet.userId),
            metadata: {
                strategy: source === "account_opening" ? "account_opening" : "lazy_legacy_snapshot",
            },
        },
        select: { id: true },
    });
}

export async function initializeWalletLedger(
    tx: TransactionClient,
    input: {
        userId: number;
        source: Extract<WalletLedgerSource, "legacy_balance_snapshot" | "account_opening">;
    }
): Promise<{ ledgerEntryId: number; walletId: number; coinBalance: number }> {
    const wallet = await lockWallet(tx, input.userId);
    const entry = await ensureWalletLedgerBaseline(tx, wallet, input.source);
    return {
        ledgerEntryId: entry.id,
        walletId: wallet.id,
        coinBalance: wallet.coinBalance,
    };
}

export async function applyWalletLedgerMutation(
    tx: TransactionClient,
    input: {
        userId: number;
        source: WalletLedgerSource;
        deltaCoin: number;
        idempotencyKey: string;
        referenceType?: string | null;
        referenceId?: string | number | null;
        actorUserId?: number | null;
        metadata?: Prisma.InputJsonValue;
    }
): Promise<WalletLedgerMutationResult> {
    assertCoinInteger(input.deltaCoin, "deltaCoin");
    if (input.deltaCoin === 0) {
        throw new RangeError("deltaCoin must not be zero for a wallet mutation.");
    }

    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey || idempotencyKey.length > 191) {
        throw new RangeError("idempotencyKey must contain 1-191 characters.");
    }

    const wallet = await lockWallet(tx, input.userId);
    await ensureWalletLedgerBaseline(tx, wallet);

    const existing = await tx.walletLedgerEntry.findUnique({
        where: { idempotencyKey },
        select: {
            id: true,
            walletId: true,
            balanceBefore: true,
            balanceAfter: true,
        },
    });
    if (existing) {
        if (existing.walletId !== wallet.id) {
            throw new Error("Wallet ledger idempotency key belongs to a different wallet.");
        }
        return {
            ledgerEntryId: existing.id,
            walletId: existing.walletId,
            balanceBefore: existing.balanceBefore,
            balanceAfter: existing.balanceAfter,
            duplicate: true,
        };
    }

    const balanceAfter = resolveWalletBalanceAfterDelta(wallet.coinBalance, input.deltaCoin);
    await tx.wallet.update({
        where: { id: wallet.id },
        data: { coinBalance: balanceAfter },
    });
    const ledgerEntry = await tx.walletLedgerEntry.create({
        data: {
            walletId: wallet.id,
            source: input.source,
            deltaCoin: input.deltaCoin,
            balanceBefore: wallet.coinBalance,
            balanceAfter,
            idempotencyKey,
            referenceType: input.referenceType ?? null,
            referenceId:
                input.referenceId === undefined || input.referenceId === null
                    ? null
                    : String(input.referenceId),
            actorUserId: input.actorUserId ?? null,
            metadata: input.metadata,
        },
        select: { id: true },
    });

    return {
        ledgerEntryId: ledgerEntry.id,
        walletId: wallet.id,
        balanceBefore: wallet.coinBalance,
        balanceAfter,
        duplicate: false,
    };
}
