/**
 * In-memory rate limiter — configurable via .env
 *
 * Variables:
 *   RATE_LIMIT_ENABLED          "true" | "false"  (default: "true")
 *   LOGIN_RATE_LIMIT_MAX        number             (default: 5)
 *   LOGIN_RATE_LIMIT_WINDOW_S   number in seconds  (default: 60)
 *   REGISTER_RATE_LIMIT_MAX     number             (default: 3)
 *   REGISTER_RATE_LIMIT_WINDOW_S number in seconds (default: 3600)
 */

interface RateLimitStore {
    count: number;
    resetAt: number; // epoch ms
}

const store = new Map<string, RateLimitStore>();

function isEnabled(): boolean {
    const v = process.env.RATE_LIMIT_ENABLED;
    // Default ON — only disabled when explicitly "false"
    return v !== "false";
}

function getEnvInt(key: string, fallback: number): number {
    const v = parseInt(process.env[key] ?? "", 10);
    return isNaN(v) ? fallback : v;
}

export type RateLimitConfig = "login" | "register";

const configs: Record<RateLimitConfig, { maxKey: string; windowKey: string; maxDefault: number; windowDefault: number }> = {
    login: {
        maxKey: "LOGIN_RATE_LIMIT_MAX",
        windowKey: "LOGIN_RATE_LIMIT_WINDOW_S",
        maxDefault: 5,
        windowDefault: 60,
    },
    register: {
        maxKey: "REGISTER_RATE_LIMIT_MAX",
        windowKey: "REGISTER_RATE_LIMIT_WINDOW_S",
        maxDefault: 3,
        windowDefault: 3600,
    },
};

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number; // epoch ms
}

/**
 * Check and increment rate limit for a given key + config.
 * @param identifier - Usually IP address, e.g. req.headers.get("x-forwarded-for") ?? "unknown"
 * @param config - "login" | "register"
 */
export function rateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
    if (!isEnabled()) {
        return { allowed: true, remaining: Infinity, resetAt: 0 };
    }

    const cfg = configs[config];
    const max = getEnvInt(cfg.maxKey, cfg.maxDefault);
    const windowMs = getEnvInt(cfg.windowKey, cfg.windowDefault) * 1000;

    const key = `${config}:${identifier}`;
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now >= existing.resetAt) {
        // First request in window
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
    }

    if (existing.count >= max) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return { allowed: true, remaining: max - existing.count, resetAt: existing.resetAt };
}

// Cleanup stale entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now >= entry.resetAt) store.delete(key);
    }
}, 5 * 60 * 1000);
