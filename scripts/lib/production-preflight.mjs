import { readFileSync } from "node:fs";
import { validateEdgeSecurityEnvironment } from "./edge-security-policy.mjs";

export function parseEnvFile(path) {
    const env = {};
    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const separator = line.indexOf("=");
        if (separator <= 0) continue;
        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if (
            value.length >= 2 &&
            ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'")))
        ) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
    return env;
}

function isTrue(value) {
    return value?.trim().toLowerCase() === "true";
}

function isPlaceholder(value) {
    return /replace|change.?me|example|placeholder|your[_-]|^<[^>]+>$/i.test(value);
}

function validateSecret(
    env,
    key,
    minimumLength,
    result
) {
    const value = env[key]?.trim() ?? "";
    if (!value) {
        result.errors.push(`${key} is required.`);
        return;
    }
    if (value.length < minimumLength || isPlaceholder(value)) {
        result.errors.push(`${key} is weak or still contains a placeholder.`);
        return;
    }
    if (new Set(value).size < 12) {
        result.errors.push(`${key} does not contain enough distinct characters.`);
        return;
    }
    result.checks.push(`${key} strength`);
}

function requireConfiguredValue(
    env,
    key,
    result
) {
    const value = env[key]?.trim() ?? "";
    if (!value || isPlaceholder(value)) {
        result.errors.push(`${key} is missing or still contains a placeholder.`);
    }
}

function validateHttpsOrigin(
    env,
    key,
    result
) {
    const value = env[key]?.trim();
    if (!value) {
        result.errors.push(`${key} is required.`);
        return null;
    }
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
            result.errors.push(`${key} must be an exact HTTPS origin without credentials, path, query, or hash.`);
            return null;
        }
        result.checks.push(`${key} HTTPS origin`);
        return url;
    } catch {
        result.errors.push(`${key} is not a valid URL.`);
        return null;
    }
}

function validateOriginList(value, key, result) {
    if (!value?.trim()) return;
    for (const entry of value.split(",").map((item) => item.trim()).filter(Boolean)) {
        if (entry === "*") {
            result.errors.push(`${key} must not contain a wildcard.`);
            continue;
        }
        try {
            const url = new URL(entry);
            if (url.protocol !== "https:" || url.origin !== entry) {
                result.errors.push(`${key} contains a non-exact HTTPS origin.`);
            }
        } catch {
            result.errors.push(`${key} contains an invalid origin.`);
        }
    }
}

function validateTurnstileHostnames(value, siteUrl, result) {
    const entries = (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    if (entries.length === 0) {
        result.errors.push("TURNSTILE_ALLOWED_HOSTNAMES must contain at least one exact hostname.");
        return;
    }
    if (entries.length > 20) {
        result.errors.push("TURNSTILE_ALLOWED_HOSTNAMES must contain at most 20 hostnames.");
    }

    const normalized = new Set();
    for (const entry of entries) {
        const hostname = entry.toLowerCase();
        if (
            hostname.length > 253 ||
            !/^[a-z0-9.-]+$/.test(hostname) ||
            hostname.startsWith(".") ||
            hostname.endsWith(".") ||
            hostname.includes("..") ||
            hostname === "localhost"
        ) {
            result.errors.push("TURNSTILE_ALLOWED_HOSTNAMES contains an invalid or non-production hostname.");
            continue;
        }
        normalized.add(hostname);
    }

    if (siteUrl && !normalized.has(siteUrl.hostname.toLowerCase())) {
        result.errors.push("TURNSTILE_ALLOWED_HOSTNAMES must include the NEXT_PUBLIC_SITE_URL hostname.");
    }
    if (normalized.size > 0) result.checks.push("Turnstile exact hostname allowlist");
}

export function validateProductionEnvironment(env) {
    const result = { errors: [], warnings: [], checks: [] };
    if (env.NODE_ENV !== "production") result.errors.push("NODE_ENV must be production.");

    const edgeSecurity = validateEdgeSecurityEnvironment(env);
    result.errors.push(...edgeSecurity.errors);
    result.warnings.push(...edgeSecurity.warnings);
    result.checks.push(...edgeSecurity.checks);

    validateSecret(env, "AUTH_SECRET", 32, result);
    validateSecret(env, "HEALTHCHECK_TOKEN", 32, result);
    validateSecret(env, "MYSQL_ROOT_PASSWORD", 20, result);
    validateSecret(env, "MYSQL_PASSWORD", 20, result);
    const secretKeys = [
        "AUTH_SECRET",
        "HEALTHCHECK_TOKEN",
        "MYSQL_ROOT_PASSWORD",
        "MYSQL_PASSWORD",
        "OBSERVABILITY_EXPORT_TOKEN",
    ];
    const populatedSecrets = secretKeys.map((key) => env[key]?.trim()).filter(Boolean);
    if (new Set(populatedSecrets).size !== populatedSecrets.length) {
        result.errors.push("Production secrets must be unique and independently generated.");
    }

    const authUrl = validateHttpsOrigin(env, "NEXTAUTH_URL", result);
    const siteUrl = validateHttpsOrigin(env, "NEXT_PUBLIC_SITE_URL", result);
    if (authUrl && siteUrl && authUrl.origin !== siteUrl.origin) {
        result.warnings.push("NEXTAUTH_URL and NEXT_PUBLIC_SITE_URL use different origins; cookie/subdomain E2E is required.");
    }
    validateOriginList(env.TRUSTED_WEB_ORIGINS, "TRUSTED_WEB_ORIGINS", result);
    if (!env.TRUSTED_WEB_ORIGINS?.trim()) {
        result.errors.push("TRUSTED_WEB_ORIGINS must explicitly include the public web origin.");
    } else if (
        siteUrl &&
        !env.TRUSTED_WEB_ORIGINS.split(",").map((entry) => entry.trim()).includes(siteUrl.origin)
    ) {
        result.errors.push("TRUSTED_WEB_ORIGINS must include NEXT_PUBLIC_SITE_URL.");
    }
    if (isTrue(env.MOBILE_AUTH_ENABLED)) {
        validateOriginList(env.API_ALLOWED_ORIGINS, "API_ALLOWED_ORIGINS", result);
    }

    if (!env.DATABASE_URL?.startsWith("mysql://")) {
        result.errors.push("DATABASE_URL must use mysql://.");
    } else {
        try {
            const databaseUrl = new URL(env.DATABASE_URL);
            if (decodeURIComponent(databaseUrl.username) !== env.MYSQL_USER) {
                result.errors.push("DATABASE_URL user must match MYSQL_USER.");
            }
            if (decodeURIComponent(databaseUrl.password) !== env.MYSQL_PASSWORD) {
                result.errors.push("DATABASE_URL password must match MYSQL_PASSWORD.");
            }
        } catch {
            result.errors.push("DATABASE_URL is invalid.");
        }
    }
    if (!env.REDIS_URL?.startsWith("redis://") && !env.REDIS_URL?.startsWith("rediss://")) {
        result.errors.push("REDIS_URL must use redis:// or rediss://.");
    }
    if (!env.REDIS_KEY_PREFIX || /development|localhost/i.test(env.REDIS_KEY_PREFIX)) {
        result.errors.push("REDIS_KEY_PREFIX must be an explicit non-development namespace.");
    }
    if (!isTrue(env.RATE_LIMIT_ENABLED)) result.errors.push("RATE_LIMIT_ENABLED must be true.");
    if (!isTrue(env.PASSWORD_BREACH_CHECK_ENABLED)) {
        result.errors.push("PASSWORD_BREACH_CHECK_ENABLED must be true.");
    }
    if (env.STATE_CHANGE_ORIGIN_POLICY !== "strict") {
        result.errors.push("STATE_CHANGE_ORIGIN_POLICY must be strict.");
    }

    if ((env.PAYTR_REFUND_MODE?.trim() || "disabled") !== "disabled") {
        result.errors.push("PAYTR_REFUND_MODE must remain disabled until PayTR sandbox refund acceptance is recorded and live activation is explicitly approved.");
    }

    if (isTrue(env.PAYMENTS_ENABLED)) {
        if (!isTrue(env.PAYMENT_LEGAL_APPROVED)) {
            result.errors.push("PAYMENT_LEGAL_APPROVED must be true before checkout is enabled.");
        }
        for (const key of [
            "PAYMENT_LEGAL_BUSINESS_NAME",
            "PAYMENT_LEGAL_BUSINESS_ADDRESS",
            "PAYMENT_LEGAL_CONTACT_EMAIL",
            "PAYMENT_CHECKOUT_TERMS_VERSION",
            "PAYMENT_PRIVACY_NOTICE_VERSION",
            "PAYMENT_DISTANCE_SALES_NOTICE_VERSION",
        ]) {
            requireConfiguredValue(env, key, result);
        }
        const activePaymentProvider = env.PAYMENT_ACTIVE_PROVIDER?.trim();
        if (activePaymentProvider === "paytr") {
            if (env.PAYTR_CHECKOUT_MODE?.trim() !== "sandbox") {
                result.errors.push("PAYTR_CHECKOUT_MODE must be sandbox; live checkout is not available yet.");
            }
            for (const key of ["PAYTR_MERCHANT_ID", "PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT"]) {
                requireConfiguredValue(env, key, result);
            }
        } else if (activePaymentProvider === "iyzico") {
            for (const key of [
                "IYZICO_CHECKOUT_MODE",
                "IYZICO_OWNER_CHECKOUT_MODE",
                "IYZICO_CALLBACK_MODE",
                "IYZICO_WEBHOOK_MODE",
                "IYZICO_RECONCILIATION_MODE",
            ]) {
                if (env[key]?.trim() !== "sandbox") {
                    result.errors.push(`${key} must be sandbox; live iyzico checkout is not available.`);
                }
            }
            for (const key of ["IYZICO_API_KEY", "IYZICO_SECRET_KEY", "IYZICO_MERCHANT_ID"]) {
                requireConfiguredValue(env, key, result);
            }
            if (!env.IYZICO_API_KEY?.trim().startsWith("sandbox-")) {
                result.errors.push("IYZICO_API_KEY must be a sandbox credential.");
            }
            if (!env.IYZICO_SECRET_KEY?.trim().startsWith("sandbox-")) {
                result.errors.push("IYZICO_SECRET_KEY must be a sandbox credential.");
            }
            if (!/^\d{1,19}$/.test(env.IYZICO_MERCHANT_ID?.trim() ?? "")) {
                result.errors.push("IYZICO_MERCHANT_ID must be a numeric merchant identifier.");
            }
            if (!isTrue(env.IYZICO_SANDBOX_ACCEPTANCE_RECORDED)) {
                result.errors.push("IYZICO_SANDBOX_ACCEPTANCE_RECORDED must be true before iyzico checkout is enabled.");
            }
        } else {
            result.errors.push("PAYMENT_ACTIVE_PROVIDER must be paytr or iyzico while checkout is enabled.");
        }
        if (!isTrue(env.JOBS_ENABLED)) {
            result.errors.push("JOBS_ENABLED must be true before checkout is enabled.");
        }
        if (!isTrue(env.PAYMENT_WEBHOOK_SCHEDULE_CONFIGURED)) {
            result.errors.push("PAYMENT_WEBHOOK_SCHEDULE_CONFIGURED must confirm the durable processor schedule before checkout is enabled.");
        }
        if (!isTrue(env.PAYMENT_RECONCILIATION_SCHEDULE_CONFIGURED)) {
            result.errors.push("PAYMENT_RECONCILIATION_SCHEDULE_CONFIGURED must confirm the provider status-query schedule before checkout is enabled.");
        }
        const webhookMaxAge = env.PAYMENT_WEBHOOK_SCHEDULE_MAX_AGE_SECONDS?.trim() ?? "";
        if (!/^\d+$/.test(webhookMaxAge) || Number(webhookMaxAge) < 60 || Number(webhookMaxAge) > 3_600) {
            result.errors.push("PAYMENT_WEBHOOK_SCHEDULE_MAX_AGE_SECONDS must be an integer between 60 and 3600.");
        }
        const reconciliationMaxAge = env.PAYMENT_RECONCILIATION_SCHEDULE_MAX_AGE_SECONDS?.trim() ?? "";
        if (!/^\d+$/.test(reconciliationMaxAge) || Number(reconciliationMaxAge) < 300 || Number(reconciliationMaxAge) > 86_400) {
            result.errors.push("PAYMENT_RECONCILIATION_SCHEDULE_MAX_AGE_SECONDS must be an integer between 300 and 86400.");
        }
        result.checks.push("payment legal and sandbox provider readiness");
    }

    if (env.REALTIME_TOPOLOGY !== "single-writer" || env.REALTIME_REPLICA_COUNT !== "1") {
        result.errors.push("Realtime topology must remain single-writer with exactly one replica.");
    }
    if (isTrue(env.ALLOW_ORIGINLESS_SOCKET_CLIENTS)) {
        result.errors.push("ALLOW_ORIGINLESS_SOCKET_CLIENTS must remain false for web launch.");
    }

    const adminMode = env.ADMIN_ACCESS_MODE;
    if (adminMode !== "restricted_login" && adminMode !== "external_gateway") {
        result.errors.push("ADMIN_ACCESS_MODE must be restricted_login or external_gateway.");
    }
    if (!isTrue(env.ADMIN_ACCESS_FAIL_CLOSED)) {
        result.errors.push("ADMIN_ACCESS_FAIL_CLOSED must be true.");
    }
    if (isTrue(env.ADMIN_ACCESS_ALLOW_LOCAL_DEV_BYPASS)) {
        result.errors.push("ADMIN_ACCESS_ALLOW_LOCAL_DEV_BYPASS must be false.");
    }
    const hasHeaderPolicy = Boolean(
        env.ADMIN_ACCESS_HEADER_NAME?.trim() && env.ADMIN_ACCESS_HEADER_VALUE?.trim()
    );
    const hasIdentityPolicy = Boolean(
        env.ADMIN_ACCESS_EMAIL_HEADER_NAME?.trim() &&
            (env.ADMIN_ACCESS_ALLOWED_EMAILS?.trim() || env.ADMIN_ACCESS_ALLOWED_EMAIL_DOMAINS?.trim())
    );
    if (!hasHeaderPolicy && !hasIdentityPolicy) {
        result.errors.push("Admin access requires an explicit gateway header or identity allowlist policy.");
    }
    if (hasHeaderPolicy) validateSecret(env, "ADMIN_ACCESS_HEADER_VALUE", 24, result);
    if (!isTrue(env.AUTH_TRUST_HOST)) result.errors.push("AUTH_TRUST_HOST must be true behind the production proxy.");
    if (!isTrue(env.TRUST_PROXY)) result.errors.push("TRUST_PROXY must be true behind the production proxy.");

    const oauthPolicy = env.PRODUCTION_OAUTH_POLICY;
    if (oauthPolicy === "google") {
        if (!isTrue(env.GOOGLE_OAUTH_ENABLED)) {
            result.errors.push("GOOGLE_OAUTH_ENABLED must be true when Google OAuth is selected.");
        }
        requireConfiguredValue(env, "AUTH_GOOGLE_ID", result);
        validateSecret(env, "AUTH_GOOGLE_SECRET", 24, result);
    } else if (oauthPolicy === "disabled_risk_accepted") {
        if (isTrue(env.GOOGLE_OAUTH_ENABLED)) {
            result.errors.push("GOOGLE_OAUTH_ENABLED must be false when OAuth is disabled.");
        }
        if (env.AUTH_GOOGLE_ID?.trim() || env.AUTH_GOOGLE_SECRET?.trim()) {
            result.errors.push("Disabled OAuth must not retain Google client credentials.");
        }
        result.warnings.push("OAuth sign-in is explicitly disabled for public launch.");
    } else {
        result.errors.push("PRODUCTION_OAUTH_POLICY must be google or disabled_risk_accepted.");
    }

    const observabilityPolicy = env.PRODUCTION_OBSERVABILITY_POLICY;
    if (observabilityPolicy === "http") {
        if (env.OBSERVABILITY_EXPORT_MODE !== "http") {
            result.errors.push("OBSERVABILITY_EXPORT_MODE must be http.");
        }
        validateSecret(env, "OBSERVABILITY_EXPORT_TOKEN", 32, result);
        try {
            const exporterUrl = new URL(env.OBSERVABILITY_EXPORT_URL ?? "");
            if (
                exporterUrl.protocol !== "https:" ||
                exporterUrl.username ||
                exporterUrl.password ||
                exporterUrl.search ||
                exporterUrl.hash
            ) {
                result.errors.push("OBSERVABILITY_EXPORT_URL must be an HTTPS URL without credentials, query, or hash.");
            } else {
                result.checks.push("observability HTTPS exporter");
            }
        } catch {
            result.errors.push("OBSERVABILITY_EXPORT_URL is invalid.");
        }
    } else if (observabilityPolicy === "disabled_risk_accepted") {
        if (env.OBSERVABILITY_EXPORT_MODE !== "disabled") {
            result.errors.push("OBSERVABILITY_EXPORT_MODE must be disabled when observability risk is accepted.");
        }
        if (env.OBSERVABILITY_EXPORT_URL?.trim() || env.OBSERVABILITY_EXPORT_TOKEN?.trim()) {
            result.errors.push("Disabled observability must not retain exporter URL or token.");
        }
        result.warnings.push("Central observability export is explicitly disabled for public launch.");
    } else {
        result.errors.push("PRODUCTION_OBSERVABILITY_POLICY must be http or disabled_risk_accepted.");
    }

    const captchaPolicy = env.PRODUCTION_CAPTCHA_POLICY;
    if (captchaPolicy === "turnstile") {
        validateSecret(env, "TURNSTILE_SECRET_KEY", 20, result);
        requireConfiguredValue(env, "TURNSTILE_SITE_KEY", result);
        validateTurnstileHostnames(env.TURNSTILE_ALLOWED_HOSTNAMES, siteUrl, result);
    } else if (captchaPolicy === "disabled_risk_accepted") {
        result.warnings.push("Captcha is explicitly disabled for public launch.");
    } else {
        result.errors.push("PRODUCTION_CAPTCHA_POLICY must be turnstile or disabled_risk_accepted.");
    }

    const emailPolicy = env.PRODUCTION_EMAIL_POLICY;
    if (emailPolicy === "smtp") {
        validateSecret(env, "EMAIL_TOKEN_SECRET", 32, result);
        requireConfiguredValue(env, "EMAIL_FROM", result);
        requireConfiguredValue(env, "SMTP_HOST", result);
        if (!/^\d+$/.test(env.SMTP_PORT ?? "") || Number(env.SMTP_PORT) < 1 || Number(env.SMTP_PORT) > 65_535) {
            result.errors.push("SMTP_PORT must be an integer between 1 and 65535.");
        }
        if (Boolean(env.SMTP_USER?.trim()) !== Boolean(env.SMTP_PASS?.trim())) {
            result.errors.push("SMTP_USER and SMTP_PASS must be configured together.");
        }
        if (env.EMAIL_PROVIDER !== "smtp") result.errors.push("EMAIL_PROVIDER must be smtp.");
        if (!isTrue(env.JOBS_ENABLED)) result.errors.push("JOBS_ENABLED must be true for email delivery.");
    } else if (emailPolicy === "disabled_risk_accepted") {
        result.warnings.push("Transactional email is explicitly disabled for public launch.");
        if (env.EMAIL_PROVIDER !== "disabled") {
            result.errors.push("EMAIL_PROVIDER must be disabled when the accepted-risk policy is selected.");
        }
    } else {
        result.errors.push("PRODUCTION_EMAIL_POLICY must be smtp or disabled_risk_accepted.");
    }

    if (!isTrue(env.BACKUP_REMOTE_ENABLED)) {
        result.errors.push("BACKUP_REMOTE_ENABLED must be true.");
    }
    for (const key of ["BACKUP_S3_ENDPOINT", "BACKUP_S3_BUCKET", "BACKUP_S3_ACCESS_KEY_ID", "BACKUP_S3_SECRET_ACCESS_KEY"]) {
        requireConfiguredValue(env, key, result);
    }

    return result;
}
