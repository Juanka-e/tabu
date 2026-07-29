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
    storeCatalogShared: getRedisKey(
        "cache",
        "store-catalog-shared",
        "v1"
    ),
    storeCatalogRevision: getRedisKey(
        "cache",
        "store-catalog-revision",
        "v2"
    ),
    mobileStorePolicy: getRedisKey(
        "mobile-api",
        "store-policy",
        "v2"
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

export async function invalidateStoreCatalogCache(): Promise<void> {
    await Promise.all([
        invalidateJsonCache(APPLICATION_CACHE_KEYS.storeCatalogShared),
        invalidateJsonCache(APPLICATION_CACHE_KEYS.storeCatalogRevision),
    ]);
}

export async function invalidateMobileStorePolicyCache(): Promise<void> {
    await invalidateJsonCache(APPLICATION_CACHE_KEYS.mobileStorePolicy);
}

export function getNotificationUnreadCountCacheKey(userId: number): string {
    return getRedisKey(
        "cache",
        "notification-unread-count",
        "v1",
        userId
    );
}

export async function invalidateNotificationUnreadCountCache(
    userId: number
): Promise<void> {
    await invalidateJsonCache(getNotificationUnreadCountCacheKey(userId));
}

export function getUserDashboardMatchSummaryCacheKey(
    userId: number
): string {
    return getRedisKey(
        "cache",
        "user-dashboard-match-summary",
        "v1",
        userId
    );
}

export async function invalidateUserDashboardMatchSummaryCache(
    userId: number
): Promise<void> {
    await invalidateJsonCache(
        getUserDashboardMatchSummaryCacheKey(userId)
    );
}

export async function invalidateVisibleCategoriesCache(): Promise<void> {
    await invalidateJsonCache(APPLICATION_CACHE_KEYS.visibleCategories);
}
