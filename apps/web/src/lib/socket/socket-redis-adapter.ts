import { createAdapter } from "@socket.io/redis-adapter";
import {
    createDedicatedRedisConnectionPair,
    getRedisKey,
} from "@hushle/platform-cache";
import type { Server } from "socket.io";

export interface SocketRedisAdapterConfig {
    enabled: boolean;
    redisConfigured: boolean;
    redisUrl: string | null;
    stickySessionsConfigured: boolean;
}

export interface SocketRedisAdapterStatus {
    enabled: boolean;
    available: boolean;
    redisConfigured: boolean;
    stickySessionsConfigured: boolean;
    roomStateBackend: "process-local";
    multiInstanceReady: false;
}

export interface SocketRedisAdapterHandle {
    getStatus(): SocketRedisAdapterStatus;
    close(): Promise<void>;
}

function readBoolean(value: string | undefined): boolean {
    return value?.trim().toLowerCase() === "true";
}

export function getSocketRedisAdapterConfig(
    env: NodeJS.ProcessEnv = process.env
): SocketRedisAdapterConfig {
    const redisUrl = env.REDIS_URL?.trim() || null;
    return {
        enabled: readBoolean(env.SOCKET_IO_REDIS_ADAPTER_ENABLED),
        redisConfigured: redisUrl !== null,
        redisUrl,
        stickySessionsConfigured: readBoolean(
            env.SOCKET_IO_STICKY_SESSIONS_CONFIGURED
        ),
    };
}

function buildStatus(
    config: SocketRedisAdapterConfig,
    available: boolean
): SocketRedisAdapterStatus {
    return {
        enabled: config.enabled,
        available,
        redisConfigured: config.redisConfigured,
        stickySessionsConfigured: config.stickySessionsConfigured,
        roomStateBackend: "process-local",
        multiInstanceReady: false,
    };
}

export async function configureSocketRedisAdapter(
    io: Server,
    env: NodeJS.ProcessEnv = process.env
): Promise<SocketRedisAdapterHandle> {
    const config = getSocketRedisAdapterConfig(env);
    if (!config.enabled) {
        return {
            getStatus: () => buildStatus(config, false),
            close: async () => undefined,
        };
    }
    if (!config.redisUrl) {
        throw new Error(
            "SOCKET_IO_REDIS_ADAPTER_ENABLED=true requires REDIS_URL"
        );
    }

    let available = false;

    const markUnavailable = () => {
        available = false;
    };

    let connections;
    try {
        connections = await createDedicatedRedisConnectionPair({
            url: config.redisUrl,
            onError: markUnavailable,
        });
        const { publisher, subscriber } = connections;
        publisher.on("ready", () => {
            available = publisher.isReady && subscriber.isReady;
        });
        subscriber.on("ready", () => {
            available = publisher.isReady && subscriber.isReady;
        });
        available = publisher.isReady && subscriber.isReady;
        io.adapter(
            createAdapter(publisher, subscriber, {
                key: getRedisKey("socket.io"),
            })
        );
    } catch (error) {
        throw new Error("Socket.IO Redis adapter connection failed", {
            cause: error,
        });
    }

    return {
        getStatus: () => buildStatus(config, available),
        close: async () => {
            available = false;
            await connections.close();
        },
    };
}
