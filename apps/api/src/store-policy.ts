import { getOrSetJsonCache, getRedisKey } from "@hushle/platform-cache";
import { prisma } from "@hushle/platform-db";

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

export async function isMobileStoreAvailable(): Promise<boolean> {
    const result = await getOrSetJsonCache<boolean>({
        key: getRedisKey("mobile-api", "store-availability", "v1"),
        ttlMs: 15_000,
        loader: async () => {
            const rows = await prisma.systemSetting.findMany({
                where: { key: { in: ["features", "platform"] } },
                select: { key: true, value: true },
            });
            const values = new Map(rows.map((row) => [row.key, asRecord(row.value)]));
            const features = values.get("features");
            const platform = values.get("platform");
            return (
                features?.storeEnabled !== false &&
                platform?.maintenanceEnabled !== true
            );
        },
    });
    return result.value;
}
