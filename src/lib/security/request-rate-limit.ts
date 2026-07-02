import { getRedisClient, isRedisConfigured } from "@/lib/redis";

interface RateLimitEntry {
    count: number;
    resetAt: number;
    timeout: ReturnType<typeof setTimeout>;
}

export interface ConsumeRequestRateLimitOptions {
    bucket: string;
    key: string;
    windowMs: number;
    maxRequests: number;
}

export interface RequestRateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
}

const rateLimitBuckets = new Map<string, Map<string, RateLimitEntry>>();

function isTruthyEnv(value: string | undefined): boolean {
    if (!value) {
        return false;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function shouldTrustProxyHeaders(): boolean {
    return isTruthyEnv(process.env.TRUST_PROXY);
}

function getTrustedForwardedIp(request: Request): string | null {
    if (!shouldTrustProxyHeaders()) {
        return null;
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp.trim();
    }

    return null;
}

function getBucketStore(bucket: string): Map<string, RateLimitEntry> {
    let store = rateLimitBuckets.get(bucket);
    if (!store) {
        store = new Map<string, RateLimitEntry>();
        rateLimitBuckets.set(bucket, store);
    }

    return store;
}

export function getRequestIp(request: Request): string {
    return getTrustedForwardedIp(request) ?? "unknown";
}

export function consumeRequestRateLimit(
    options: ConsumeRequestRateLimitOptions
): RequestRateLimitResult {
    const { bucket, key, windowMs, maxRequests } = options;
    const store = getBucketStore(bucket);
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
        if (entry?.timeout) {
            clearTimeout(entry.timeout);
        }

        const timeout = setTimeout(() => {
            store.delete(key);
        }, windowMs);

        if (typeof timeout.unref === "function") {
            timeout.unref();
        }

        entry = {
            count: 0,
            resetAt: now + windowMs,
            timeout,
        };
        store.set(key, entry);
    }

    if (entry.count >= maxRequests) {
        return {
            allowed: false,
            limit: maxRequests,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
        };
    }

    entry.count += 1;

    return {
        allowed: true,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - entry.count),
        retryAfterSeconds: Math.max(0, Math.ceil((entry.resetAt - now) / 1000)),
    };
}

export async function consumeDistributedRequestRateLimit(
    options: ConsumeRequestRateLimitOptions
): Promise<RequestRateLimitResult> {
    if (!isRedisConfigured()) {
        return consumeRequestRateLimit(options);
    }

    const client = await getRedisClient();
    if (!client) {
        return consumeRequestRateLimit(options);
    }

    const { bucket, key, windowMs, maxRequests } = options;
    const counterKey = `rate-limit:${bucket}:${key}`;
    const count = await client.incr(counterKey);

    if (count === 1) {
        await client.pExpire(counterKey, windowMs);
    }

    const ttlMs = await client.pTTL(counterKey);
    const retryAfterSeconds = Math.max(0, Math.ceil(Math.max(ttlMs, 0) / 1000));

    if (count > maxRequests) {
        return {
            allowed: false,
            limit: maxRequests,
            remaining: 0,
            retryAfterSeconds: Math.max(1, retryAfterSeconds),
        };
    }

    return {
        allowed: true,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - count),
        retryAfterSeconds,
    };
}

export function buildRateLimitHeaders(result: RequestRateLimitResult): Record<string, string> {
    return {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
    };
}

export function resetRequestRateLimitBuckets(): void {
    for (const store of rateLimitBuckets.values()) {
        for (const entry of store.values()) {
            clearTimeout(entry.timeout);
        }
        store.clear();
    }
    rateLimitBuckets.clear();
}
