import { createClient } from "redis";

type AppRedisClient = ReturnType<typeof createClient>;
type RedisSetOptions = {
    PX?: number;
    NX?: boolean;
};

export interface RedisLikeClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: RedisSetOptions): Promise<string | null>;
    del(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    pExpire(key: string, milliseconds: number): Promise<number>;
    pTTL(key: string): Promise<number>;
}

let redisClient: AppRedisClient | null = null;
let redisConnectPromise: Promise<AppRedisClient | null> | null = null;
let redisDisabled = false;
let redisTestClient: RedisLikeClient | null = null;

function getRedisUrl(): string | null {
    const url = process.env.REDIS_URL?.trim();
    return url ? url : null;
}

export function isRedisConfigured(): boolean {
    if (redisTestClient) {
        return true;
    }

    return Boolean(getRedisUrl()) && !redisDisabled;
}

export async function getRedisClient(): Promise<RedisLikeClient | null> {
    if (redisTestClient) {
        return redisTestClient;
    }

    if (redisDisabled) {
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
            return client;
        })
        .catch((error) => {
            console.error("Redis connect failed, falling back to in-memory mode:", error);
            redisDisabled = true;
            return null;
        })
        .finally(() => {
            redisConnectPromise = null;
        });

    return redisConnectPromise;
}

export function setRedisTestClient(client: RedisLikeClient): void {
    redisTestClient = client;
    redisDisabled = false;
}

export function resetRedisTestClient(): void {
    redisTestClient = null;
    redisDisabled = false;
}
