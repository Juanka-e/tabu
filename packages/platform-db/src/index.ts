import { PrismaClient } from "@prisma/client";
export {
    CosmeticRenderMode,
    ItemRarity,
    Prisma,
    PrismaClient,
    PromotionDiscountType,
    PromotionTargetType,
    ShopItemType,
    WalletLedgerSource,
} from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

let dbUrl = process.env.DATABASE_URL;
if (dbUrl && !dbUrl.includes("connection_limit")) {
    const configuredLimit = Number(process.env.DATABASE_CONNECTION_LIMIT);
    const connectionLimit =
        Number.isInteger(configuredLimit) &&
        configuredLimit >= 1 &&
        configuredLimit <= 100
            ? configuredLimit
            : 20;
    dbUrl = `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}connection_limit=${connectionLimit}`;
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
        datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
