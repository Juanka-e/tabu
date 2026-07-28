import { createClient } from "redis";

type AppRedisClient = ReturnType<typeof createClient>;
type RedisSetOptions = {
    PX?: number;
    NX?: boolean;
};

export interface RedisLikeClient {
    ping(): Promise<string>;
    get(key: string): Promise<string | null>;
    mGet?(keys: string[]): Promise<Array<string | null>>;
    set(key: string, value: string, options?: RedisSetOptions): Promise<string | null>;
    del(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    pExpire(key: string, milliseconds: number): Promise<number>;
    pTTL(key: string): Promise<number>;
    sAdd?(key: string, member: string): Promise<number>;
    sRem?(key: string, member: string): Promise<number>;
    sMembers?(key: string): Promise<string[]>;
    eval(
        script: string,
        options: { keys: string[]; arguments: string[] }
    ): Promise<unknown>;
}

export interface RedisHealth {
    configured: boolean;
    available: boolean;
    latencyMs: number | null;
}

let redisClient: AppRedisClient | null = null;
let redisConnectPromise: Promise<AppRedisClient | null> | null = null;
let redisRetryAfter = 0;
let redisTestClient: RedisLikeClient | null = null;

function getRedisUrl(): string | null {
    const url = process.env.REDIS_URL?.trim();
    return url ? url : null;
}

export function getRedisKey(...segments: Array<string | number>): string {
    const prefix = process.env.REDIS_KEY_PREFIX?.trim() || "hushle";
    return [prefix, ...segments].join(":");
}

function getPositiveIntegerSetting(name: string, fallback: number): number {
    const parsed = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isRedisConfigured(): boolean {
    if (redisTestClient) {
        return true;
    }

    return Boolean(getRedisUrl());
}

export async function getRedisClient(): Promise<RedisLikeClient | null> {
    if (redisTestClient) {
        return redisTestClient;
    }

    if (Date.now() < redisRetryAfter) {
        return null;
    }

    if (redisClient?.isReady) {
        return redisClient;
    }

    if (redisConnectPromise) {
        return redisConnectPromise;
    }

    const redisUrl = getRedisUrl();
    if (!redisUrl) {
        return null;
    }

    const client = createClient({
        url: redisUrl,
        socket: {
            connectTimeout: getPositiveIntegerSetting(
                "REDIS_CONNECT_TIMEOUT_MS",
                3_000
            ),
            reconnectStrategy(retries) {
                return retries > 5 ? false : Math.min(retries * 200, 2_000);
            },
        },
    });

    client.on("error", (error) => {
        console.error("Redis client error:", error);
    });

    redisConnectPromise = client
        .connect()
        .then(() => {
            redisClient = client;
            redisRetryAfter = 0;
            return client;
        })
        .catch((error) => {
            console.error("Redis connect failed, falling back to in-memory mode:", error);
            redisRetryAfter =
                Date.now() +
                getPositiveIntegerSetting("REDIS_RETRY_COOLDOWN_MS", 30_000);
            return null;
        })
        .finally(() => {
            redisConnectPromise = null;
        });

    return redisConnectPromise;
}

export async function getRedisHealth(): Promise<RedisHealth> {
    if (!isRedisConfigured()) {
        return {
            configured: false,
            available: false,
            latencyMs: null,
        };
    }

    const startedAt = Date.now();
    const client = await getRedisClient();
    if (!client) {
        return {
            configured: true,
            available: false,
            latencyMs: null,
        };
    }

    try {
        const response = await client.ping();
        return {
            configured: true,
            available: response === "PONG",
            latencyMs: Date.now() - startedAt,
        };
    } catch {
        return {
            configured: true,
            available: false,
            latencyMs: null,
        };
    }
}

export async function closeRedisClient(): Promise<void> {
    const client = redisClient;
    redisClient = null;
    redisConnectPromise = null;
    redisRetryAfter = 0;

    if (client?.isOpen) {
        await client.quit();
    }
}

export function setRedisTestClient(client: RedisLikeClient): void {
    redisTestClient = client;
    redisRetryAfter = 0;
}

export function resetRedisTestClient(): void {
    redisTestClient = null;
    redisRetryAfter = 0;
}
