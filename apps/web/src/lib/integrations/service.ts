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

function buildStorageItems(): IntegrationItem[] {
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
            status: "planned",
            summary: "Shared cache/rate-limit omurgasi henuz bagli degil.",
            details: [
                "Planned for cache-and-rate-limit foundation.",
                "Will support shared rate limits, cache invalidation and multi-instance coordination.",
                "See docs/cache-and-storage-strategy.md",
            ],
        },
    ];
}

export async function getIntegrationHubSnapshot(
    options?: { settings?: SystemSettings }
): Promise<IntegrationHubSnapshot> {
    const settings = options?.settings ?? (await getSystemSettings());

    return {
        items: [
            ...buildRuntimeItems(),
            ...buildCaptchaItems(settings),
            ...buildAccessItems(),
            ...buildMessagingItems(),
            ...buildStorageItems(),
        ],
    };
}
