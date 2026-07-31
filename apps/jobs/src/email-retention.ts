import { prisma } from "@hushle/platform-db";
import type { EmailRetentionConfig } from "./config";

export interface EmailRetentionStore {
    findOutboxIds(input: {
        sentCutoff: Date;
        deadLetterCutoff: Date;
        limit: number;
    }): Promise<string[]>;
    deleteOutbox(ids: string[]): Promise<number>;
    findTokenIds(cutoff: Date, limit: number): Promise<string[]>;
    deleteTokens(ids: string[]): Promise<number>;
    findPendingAccountIds(cutoff: Date, limit: number): Promise<number[]>;
    deletePendingAccounts(ids: number[]): Promise<number>;
}

const prismaEmailRetentionStore: EmailRetentionStore = {
    async findOutboxIds(input) {
        const rows = await prisma.emailOutboxMessage.findMany({
            where: {
                OR: [
                    {
                        status: "sent",
                        sentAt: { lt: input.sentCutoff },
                    },
                    {
                        status: "dead_letter",
                        updatedAt: { lt: input.deadLetterCutoff },
                    },
                ],
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: input.limit,
            select: { id: true },
        });
        return rows.map((row) => row.id);
    },
    async deleteOutbox(ids) {
        const result = await prisma.emailOutboxMessage.deleteMany({
            where: { id: { in: ids } },
        });
        return result.count;
    },
    async findTokenIds(cutoff, limit) {
        const rows = await prisma.emailVerificationToken.findMany({
            where: {
                expiresAt: { lt: cutoff },
            },
            orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
            take: limit,
            select: { id: true },
        });
        return rows.map((row) => row.id);
    },
    async deleteTokens(ids) {
        const result = await prisma.emailVerificationToken.deleteMany({
            where: { id: { in: ids } },
        });
        return result.count;
    },
    async findPendingAccountIds(cutoff, limit) {
        const rows = await prisma.user.findMany({
            where: {
                accountStatus: "pending_email_verification",
                emailVerifiedAt: null,
                emailVerificationRequiredAt: { lt: cutoff },
            },
            orderBy: [
                { emailVerificationRequiredAt: "asc" },
                { id: "asc" },
            ],
            take: limit,
            select: { id: true },
        });
        return rows.map((row) => row.id);
    },
    async deletePendingAccounts(ids) {
        const result = await prisma.user.deleteMany({
            where: {
                id: { in: ids },
                accountStatus: "pending_email_verification",
                emailVerifiedAt: null,
            },
        });
        return result.count;
    },
};

export async function runEmailRetention(input: {
    config: EmailRetentionConfig;
    dryRun: boolean;
    now?: Date;
    store?: EmailRetentionStore;
}) {
    const now = input.now ?? new Date();
    const dayMs = 24 * 60 * 60_000;
    const sentCutoff = new Date(
        now.getTime() - input.config.sentRetentionDays * dayMs
    );
    const deadLetterCutoff = new Date(
        now.getTime() - input.config.deadLetterRetentionDays * dayMs
    );
    const tokenCutoff = new Date(
        now.getTime() - input.config.tokenRetentionDays * dayMs
    );
    const pendingAccountCutoff = new Date(
        now.getTime() - input.config.pendingAccountRetentionDays * dayMs
    );
    const store = input.store ?? prismaEmailRetentionStore;
    const [outboxIds, tokenIds, pendingAccountIds] = await Promise.all([
        store.findOutboxIds({
            sentCutoff,
            deadLetterCutoff,
            limit: input.config.batchSize,
        }),
        store.findTokenIds(tokenCutoff, input.config.batchSize),
        store.findPendingAccountIds(
            pendingAccountCutoff,
            input.config.batchSize
        ),
    ]);

    const [
        deletedOutboxCount,
        deletedTokenCount,
        deletedPendingAccountCount,
    ] = input.dryRun
        ? [0, 0, 0]
        : await Promise.all([
              outboxIds.length > 0 ? store.deleteOutbox(outboxIds) : 0,
              tokenIds.length > 0 ? store.deleteTokens(tokenIds) : 0,
              pendingAccountIds.length > 0
                  ? store.deletePendingAccounts(pendingAccountIds)
                  : 0,
          ]);

    return {
        dryRun: input.dryRun,
        outboxCandidateCount: outboxIds.length,
        tokenCandidateCount: tokenIds.length,
        pendingAccountCandidateCount: pendingAccountIds.length,
        deletedOutboxCount,
        deletedTokenCount,
        deletedPendingAccountCount,
        hasMore:
            outboxIds.length === input.config.batchSize ||
            tokenIds.length === input.config.batchSize ||
            pendingAccountIds.length === input.config.batchSize,
    };
}
