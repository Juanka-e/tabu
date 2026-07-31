import { readFileSync } from "node:fs";

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

export function validateProductionEnvironment(env) {
    const result = { errors: [], warnings: [], checks: [] };
    if (env.NODE_ENV !== "production") result.errors.push("NODE_ENV must be production.");

    validateSecret(env, "AUTH_SECRET", 32, result);
    validateSecret(env, "HEALTHCHECK_TOKEN", 32, result);
    validateSecret(env, "MYSQL_ROOT_PASSWORD", 20, result);
    validateSecret(env, "MYSQL_PASSWORD", 20, result);
    const secretKeys = ["AUTH_SECRET", "HEALTHCHECK_TOKEN", "MYSQL_ROOT_PASSWORD", "MYSQL_PASSWORD"];
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

    const captchaPolicy = env.PRODUCTION_CAPTCHA_POLICY;
    if (captchaPolicy === "turnstile") {
        validateSecret(env, "TURNSTILE_SECRET_KEY", 20, result);
        requireConfiguredValue(env, "TURNSTILE_SITE_KEY", result);
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
