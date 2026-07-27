import { PrismaClient } from "@prisma/client";
export {
    CosmeticRenderMode,
    ItemRarity,
    Prisma,
    PrismaClient,
    PromotionDiscountType,
    PromotionTargetType,
    ShopItemType,
} from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

let dbUrl = process.env.DATABASE_URL;
if (dbUrl && !dbUrl.includes("connection_limit")) {
    dbUrl = `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}connection_limit=20`;
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
