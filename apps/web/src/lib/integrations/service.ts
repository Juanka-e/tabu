import {
    getJsonCacheMetrics,
    getRedisHealth,
    type JsonCacheMetrics,
    type RedisHealth,
} from "@hushle/platform-cache";
import { getAdminAccessPolicy } from "@/lib/admin/access-policy";
import { shouldTrustAuthHost } from "@/lib/auth-host";
import { getCaptchaProviderReadiness, getSystemSettings } from "@/lib/system-settings/service";
import type { CaptchaSettings, SystemSettings } from "@/types/system-settings";

export type IntegrationStatus = "ready" | "partial" | "missing" | "planned";

export interface IntegrationItem {
    id: string;
    category: "runtime" | "security" | "access" | "messaging" | "storage";
    title: string;
    status: IntegrationStatus;
    summary: string;
    details: string[];
}

export interface IntegrationHubSnapshot {
    items: IntegrationItem[];
}

function hasEnvValue(name: string): boolean {
    const value = process.env[name];
    return Boolean(value && value.trim());
}

function isStrongAuthSecret(value: string | undefined): boolean {
    if (!value) {
        return false;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.includes("replace_with_")) {
        return false;
    }

    return trimmed.length >= 32;
}

function getEnabledCaptchaFlows(captcha: CaptchaSettings): string[] {
    const flows: string[] = [];
    if (captcha.onRegister) flows.push("register");
    if (captcha.onLogin) flows.push("login");
    if (captcha.onRoomCreate) flows.push("room_create");
    if (captcha.onGuestJoin) flows.push("guest_join");
    return flows;
}

function buildRuntimeItems(): IntegrationItem[] {
    const databaseConfigured = hasEnvValue("DATABASE_URL");
    const authSecretStrong = isStrongAuthSecret(process.env.AUTH_SECRET);
    const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || "";
    const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
    const authTrustHostEnabled = shouldTrustAuthHost();
    const isProduction = process.env.NODE_ENV === "production";

    return [
        {
            id: "database",
            category: "runtime",
            title: "Database",
            status: databaseConfigured ? "ready" : "missing",
            summary: databaseConfigured ? "MySQL baglantisi tanimli." : "DATABASE_URL eksik.",
            details: [
                `DATABASE_URL: ${databaseConfigured ? "configured" : "missing"}`,
                "Source of truth MySQL tarafinda kalir.",
            ],
        },
        {
            id: "auth-core",
            category: "runtime",
            title: "Auth.js Core",
            status:
                authSecretStrong && authTrustHostEnabled && nextAuthUrl && publicSiteUrl
                    ? "ready"
                    : authSecretStrong && authTrustHostEnabled && (nextAuthUrl || publicSiteUrl)
                      ? "partial"
                    : "missing",
            summary: authSecretStrong
                ? "Auth temel env baglantilari kontrol edildi."
                : "AUTH_SECRET zayif veya eksik.",
            details: [
                `AUTH_SECRET: ${authSecretStrong ? "strong" : "missing_or_weak"}`,
                `NEXTAUTH_URL: ${nextAuthUrl ? nextAuthUrl : "missing"}`,
                `NEXT_PUBLIC_SITE_URL: ${publicSiteUrl ? publicSiteUrl : "missing"}`,
                `AUTH_TRUST_HOST: ${authTrustHostEnabled ? (isProduction ? "enabled" : "dev_auto_trust") : "disabled"}`,
            ],
        },
    ];
}

function buildCaptchaItems(settings: SystemSettings): IntegrationItem[] {
    const readiness = getCaptchaProviderReadiness();
    const activeFlows = getEnabledCaptchaFlows(settings.security.captcha);

    return [
        {
            id: "turnstile",
            category: "security",
            title: "Cloudflare Turnstile",
            status: readiness.turnstileConfigured ? "ready" : "missing",
            summary:
                settings.security.captcha.provider === "turnstile"
                    ? `Aktif provider. Mode: ${settings.security.captcha.turnstileMode}.`
                    : "Alternate provider olarak hazir tutuluyor.",
            details: [
                `Configured: ${readiness.turnstileConfigured ? "yes" : "no"}`,
                `Provider active: ${settings.security.captcha.provider === "turnstile" ? "yes" : "no"}`,
                `Captcha enabled: ${settings.security.captcha.enabled ? "yes" : "no"}`,
                `Protected flows: ${activeFlows.length > 0 ? activeFlows.join(", ") : "none"}`,
            ],
        },
        {
            id: "recaptcha",
            category: "security",
            title: "reCAPTCHA v3",
            status: readiness.recaptchaConfigured ? "ready" : "missing",
            summary:
                settings.security.captcha.provider === "recaptcha_v3"
                    ? "Aktif alternate captcha provider."
                    : "Fallback/alternate provider olarak pasif.",
            details: [
                `Configured: ${readiness.recaptchaConfigured ? "yes" : "no"}`,
                `Provider active: ${settings.security.captcha.provider === "recaptcha_v3" ? "yes" : "no"}`,
                `Score threshold: ${settings.security.captcha.recaptchaScoreThreshold}`,
            ],
        },
    ];
}

function buildAccessItems(): IntegrationItem[] {
    const policy = getAdminAccessPolicy();
    const hasHeaderPolicy = Boolean(policy.headerName && policy.headerValue);
    const hasEmailPolicy =
        Boolean(policy.emailHeaderName) &&
        (policy.allowedEmails.length > 0 || policy.allowedEmailDomains.length > 0);

    const status: IntegrationStatus =
        policy.mode === "public_login"
            ? "partial"
            : hasHeaderPolicy || hasEmailPolicy
              ? "ready"
              : policy.failClosed
                ? "missing"
                : "partial";

    return [
        {
            id: "admin-access-gateway",
            category: "access",
            title: "Admin Access Gateway",
            status,
            summary: `Mode: ${policy.mode}. Fail-closed: ${policy.failClosed ? "yes" : "no"}.`,
            details: [
                `Header policy: ${hasHeaderPolicy ? "configured" : "missing"}`,
                `Email policy: ${hasEmailPolicy ? "configured" : "missing"}`,
                `Local dev bypass: ${policy.allowLocalDevBypass ? "enabled" : "disabled"}`,
            ],
        },
    ];
}

function buildMessagingItems(): IntegrationItem[] {
    return [
        {
            id: "email-outbound",
            category: "messaging",
            title: "Email Outbound",
            status: "planned",
            summary: "Kullanici email foundation var, ancak outbound provider henuz bagli degil.",
            details: [
                "Email identity and profile fields are implemented.",
                "SMTP / transactional mail provider wiring is not implemented yet.",
                "This should move into Integration Hub once outbound delivery is added.",
            ],
        },
    ];
}

function buildStorageItems(
    redis: RedisHealth,
    cache: JsonCacheMetrics
): IntegrationItem[] {
    const redisStatus: IntegrationStatus = redis.available
        ? "ready"
        : redis.configured
          ? "partial"
          : "planned";
    const redisSummary = redis.available
        ? `Shared Redis cache and coordination are available (${redis.latencyMs ?? 0} ms).`
        : redis.configured
          ? "Redis is configured but currently unavailable; memory fallback is active where safe."
          : "Redis is not configured; local memory fallback is active where safe.";

    return [
        {
            id: "branding-assets",
            category: "storage",
            title: "Branding Asset Storage",
            status: "ready",
            summary: "Branding uploadlar local public storage uzerinden calisiyor.",
            details: [
                "Current path: public/branding/*",
                "Useful for development and simple deployments.",
                "Can later move behind storage/CDN provider without changing admin UX intent.",
            ],
        },
        {
            id: "redis-valkey",
            category: "storage",
            title: "Redis / Valkey",
            status: redisStatus,
            summary: redisSummary,
            details: [
                `Configured: ${redis.configured ? "yes" : "no"}`,
                `Available: ${redis.available ? "yes" : "no"}`,
                `Latency: ${redis.latencyMs ?? "-"} ms`,
                `Cache hits: redis=${cache.redisHits}, memory=${cache.memoryHits}`,
                `Cache misses/loads: ${cache.misses}/${cache.loads}`,
                `Cache errors: read=${cache.readErrors}, write=${cache.writeErrors}`,
                "Shared rate limits, cache invalidation, room coordination and capacity heartbeats are active when Redis is available.",
                "See docs/cache-and-storage-strategy.md",
            ],
        },
    ];
}

export async function getIntegrationHubSnapshot(
    options?: { settings?: SystemSettings }
): Promise<IntegrationHubSnapshot> {
    const [settings, redis] = await Promise.all([
        options?.settings ?? getSystemSettings(),
        getRedisHealth(),
    ]);
    const cache = getJsonCacheMetrics();

    return {
        items: [
            ...buildRuntimeItems(),
            ...buildCaptchaItems(settings),
            ...buildAccessItems(),
            ...buildMessagingItems(),
            ...buildStorageItems(redis, cache),
        ],
    };
}
