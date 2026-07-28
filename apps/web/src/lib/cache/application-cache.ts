import {
    getRedisKey,
    invalidateJsonCache,
} from "@hushle/platform-cache";

export const APPLICATION_CACHE_KEYS = {
    adminDashboardStaticStats: getRedisKey(
        "cache",
        "admin-dashboard-static-stats",
        "v1"
    ),
    systemSettings: getRedisKey(
        "cache",
        "system-settings",
        "v1"
    ),
    visibleCategories: getRedisKey(
        "cache",
        "visible-categories",
        "v1"
    ),
} as const;

export async function invalidateAdminDashboardStatsCache(): Promise<void> {
    await invalidateJsonCache(
        APPLICATION_CACHE_KEYS.adminDashboardStaticStats
    );
}

export async function invalidateSystemSettingsCache(): Promise<void> {
    await invalidateJsonCache(APPLICATION_CACHE_KEYS.systemSettings);
}

export async function invalidateVisibleCategoriesCache(): Promise<void> {
    await invalidateJsonCache(APPLICATION_CACHE_KEYS.visibleCategories);
}
