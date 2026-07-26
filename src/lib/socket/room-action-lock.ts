import { getRedisClient, getRedisKey, isRedisConfigured } from "@/lib/redis";

const localLocks = new Map<string, ReturnType<typeof setTimeout>>();

function getRoomActionLockKey(roomCode: string, action: string): string {
    return getRedisKey("room-action-lock", roomCode, action);
}

function claimLocalLock(key: string, ttlMs: number): boolean {
    const existing = localLocks.get(key);
    if (existing) {
        return false;
    }

    const timeout = setTimeout(() => {
        localLocks.delete(key);
    }, ttlMs);

    if (typeof timeout.unref === "function") {
        timeout.unref();
    }

    localLocks.set(key, timeout);
    return true;
}

function releaseLocalLock(key: string): void {
    const timeout = localLocks.get(key);
    if (!timeout) {
        return;
    }

    clearTimeout(timeout);
    localLocks.delete(key);
}

export async function acquireRoomActionLock(
    roomCode: string,
    action: string,
    ttlMs: number
): Promise<boolean> {
    const key = getRoomActionLockKey(roomCode, action);

    if (!isRedisConfigured()) {
        return claimLocalLock(key, ttlMs);
    }

    const client = await getRedisClient();
    if (!client) {
        return claimLocalLock(key, ttlMs);
    }

    const acquired = await client.set(key, "1", {
        PX: ttlMs,
        NX: true,
    });

    return acquired === "OK";
}

export async function releaseRoomActionLock(
    roomCode: string,
    action: string
): Promise<void> {
    const key = getRoomActionLockKey(roomCode, action);

    if (!isRedisConfigured()) {
        releaseLocalLock(key);
        return;
    }

    const client = await getRedisClient();
    if (!client) {
        releaseLocalLock(key);
        return;
    }

    await client.del(key);
}

export async function runWithRoomActionLock<T>(
    roomCode: string,
    action: string,
    ttlMs: number,
    operation: () => Promise<T>
): Promise<{ acquired: boolean; result?: T }> {
    const acquired = await acquireRoomActionLock(roomCode, action, ttlMs);
    if (!acquired) {
        return { acquired: false };
    }

    try {
        return {
            acquired: true,
            result: await operation(),
        };
    } finally {
        await releaseRoomActionLock(roomCode, action);
    }
}

export function resetRoomActionLockState(): void {
    for (const [key, timeout] of localLocks.entries()) {
        clearTimeout(timeout);
        localLocks.delete(key);
    }
}
