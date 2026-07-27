import assert from "node:assert/strict";
import {
    consumeDistributedRequestRateLimit,
    resetRequestRateLimitBuckets,
} from "../apps/web/src/lib/security/request-rate-limit";
import {
    claimOnlineRoomMembership,
    getOnlineRoomMembership,
    releaseOnlineRoomMembership,
    resetRoomMembershipState,
} from "../apps/web/src/lib/socket/room-membership";
import {
    clearPendingRoomAdminHandoff,
    getPendingRoomAdminHandoff,
    resetRoomAdminHandoffState,
    setPendingRoomAdminHandoff,
} from "../apps/web/src/lib/socket/room-admin-handoff";
import {
    acquireRoomActionLock,
    releaseRoomActionLock,
    resetRoomActionLockState,
} from "../apps/web/src/lib/socket/room-action-lock";
import {
    getRedisHealth,
    getRedisKey,
    resetRedisTestClient,
    setRedisTestClient,
    type RedisLikeClient,
} from "@hushle/platform-cache";

type StoredValue = {
    value: string;
    expiresAt: number | null;
};

class FakeRedisClient implements RedisLikeClient {
    private readonly store = new Map<string, StoredValue>();

    async ping(): Promise<string> {
        return "PONG";
    }

    private cleanup(key: string): void {
        const entry = this.store.get(key);
        if (!entry) {
            return;
        }

        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
            this.store.delete(key);
        }
    }

    async get(key: string): Promise<string | null> {
        this.cleanup(key);
        return this.store.get(key)?.value ?? null;
    }

    async set(
        key: string,
        value: string,
        options?: { PX?: number; NX?: boolean }
    ): Promise<string | null> {
        this.cleanup(key);

        if (options?.NX && this.store.has(key)) {
            return null;
        }

        this.store.set(key, {
            value,
            expiresAt:
                typeof options?.PX === "number" ? Date.now() + options.PX : null,
        });

        return "OK";
    }

    async del(key: string): Promise<number> {
        this.cleanup(key);
        return this.store.delete(key) ? 1 : 0;
    }

    async incr(key: string): Promise<number> {
        this.cleanup(key);
        const current = this.store.get(key);
        const nextValue = (current ? Number.parseInt(current.value, 10) : 0) + 1;
        this.store.set(key, {
            value: String(nextValue),
            expiresAt: current?.expiresAt ?? null,
        });
        return nextValue;
    }

    async pExpire(key: string, milliseconds: number): Promise<number> {
        this.cleanup(key);
        const current = this.store.get(key);
        if (!current) {
            return 0;
        }

        current.expiresAt = Date.now() + milliseconds;
        this.store.set(key, current);
        return 1;
    }

    async pTTL(key: string): Promise<number> {
        this.cleanup(key);
        const current = this.store.get(key);
        if (!current) {
            return -2;
        }

        if (current.expiresAt === null) {
            return -1;
        }

        return Math.max(0, current.expiresAt - Date.now());
    }
}

const originalRedisUrl = process.env.REDIS_URL;
const originalRedisKeyPrefix = process.env.REDIS_KEY_PREFIX;

async function run(): Promise<void> {
    process.env.REDIS_URL = "redis://fake-test";
    process.env.REDIS_KEY_PREFIX = "hushle:test";
    setRedisTestClient(new FakeRedisClient());
    resetRequestRateLimitBuckets();
    resetRoomMembershipState();
    resetRoomAdminHandoffState();

    assert.equal(
        getRedisKey("room-membership", "user", 42),
        "hushle:test:room-membership:user:42"
    );
    const redisHealth = await getRedisHealth();
    assert.equal(redisHealth.configured, true);
    assert.equal(redisHealth.available, true);
    assert.equal(typeof redisHealth.latencyMs, "number");

    const firstRate = await consumeDistributedRequestRateLimit({
        bucket: "distributed-test",
        key: "ip:203.0.113.10",
        windowMs: 60_000,
        maxRequests: 2,
    });
    assert.equal(firstRate.allowed, true);
    assert.equal(firstRate.remaining, 1);

    const secondRate = await consumeDistributedRequestRateLimit({
        bucket: "distributed-test",
        key: "ip:203.0.113.10",
        windowMs: 60_000,
        maxRequests: 2,
    });
    assert.equal(secondRate.allowed, true);
    assert.equal(secondRate.remaining, 0);

    const blockedRate = await consumeDistributedRequestRateLimit({
        bucket: "distributed-test",
        key: "ip:203.0.113.10",
        windowMs: 60_000,
        maxRequests: 2,
    });
    assert.equal(blockedRate.allowed, false);

    const firstMembershipClaim = await claimOnlineRoomMembership(42, "ROOM42");
    assert.equal(firstMembershipClaim.allowed, true);
    assert.equal(await getOnlineRoomMembership(42), "ROOM42");

    resetRoomMembershipState();

    const conflictingMembershipClaim = await claimOnlineRoomMembership(42, "ROOM99");
    assert.equal(conflictingMembershipClaim.allowed, false);
    assert.equal(conflictingMembershipClaim.currentRoomCode, "ROOM42");

    await releaseOnlineRoomMembership(42, "ROOM42");
    assert.equal(await getOnlineRoomMembership(42), null);

    const pendingHandoff = await setPendingRoomAdminHandoff("ROOM42", "user:42", 30_000);
    assert.equal(pendingHandoff.roomCode, "ROOM42");

    resetRoomAdminHandoffState();

    const storedHandoff = await getPendingRoomAdminHandoff("ROOM42");
    assert.equal(storedHandoff?.adminPlayerId, "user:42");

    await clearPendingRoomAdminHandoff("ROOM42", "user:42");
    assert.equal(await getPendingRoomAdminHandoff("ROOM42"), null);

    const firstLock = await acquireRoomActionLock("ROOM42", "start-game", 5_000);
    assert.equal(firstLock, true);
    const secondLock = await acquireRoomActionLock("ROOM42", "start-game", 5_000);
    assert.equal(secondLock, false);
    await releaseRoomActionLock("ROOM42", "start-game");
    const thirdLock = await acquireRoomActionLock("ROOM42", "start-game", 5_000);
    assert.equal(thirdLock, true);
    await releaseRoomActionLock("ROOM42", "start-game");

    console.log("distributed coordination smoke test passed");
}

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => {
        resetRedisTestClient();
        resetRequestRateLimitBuckets();
        resetRoomMembershipState();
        resetRoomAdminHandoffState();
        resetRoomActionLockState();

        if (originalRedisUrl === undefined) {
            delete process.env.REDIS_URL;
        } else {
            process.env.REDIS_URL = originalRedisUrl;
        }

        if (originalRedisKeyPrefix === undefined) {
            delete process.env.REDIS_KEY_PREFIX;
        } else {
            process.env.REDIS_KEY_PREFIX = originalRedisKeyPrefix;
        }
    });
