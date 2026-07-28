import { createServer } from "http";
import { loadEnvConfig } from "@next/env";
import next from "next";
import { Server } from "socket.io";
import { getToken } from "next-auth/jwt";
import { fileURLToPath } from "node:url";
import {
    setupGameSocket,
    getLocalRoomCapacityMetrics,
    getRoomMetrics,
} from "./src/lib/socket/game-socket";
import { isHealthEndpointAllowed } from "./src/lib/security/health-check";
import { closeRedisClient, getRedisHealth } from "@hushle/platform-cache";
import {
    allowOriginlessSocketClients,
    isTrustedWebOrigin,
    parseTrustedWebOrigins,
} from "./src/lib/security/web-origin-policy";
import {
    getCapacityInstanceId,
    publishCapacityHeartbeat,
    removeCapacityHeartbeat,
} from "./src/lib/socket/room-capacity";
import {
    configureSocketRedisAdapter,
    getSocketRedisAdapterConfig,
    type SocketRedisAdapterHandle,
} from "./src/lib/socket/socket-redis-adapter";
import {
    createRoomOwnershipCoordinator,
    getRoomOwnershipConfig,
    type RoomOwnershipCoordinator,
} from "./src/lib/socket/room-ownership";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
loadEnvConfig(workspaceRoot, process.env.NODE_ENV !== "production");
process.chdir(appDirectory);

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || (dev ? "localhost" : "127.0.0.1");
const port = parseInt(process.env.PORT || "3000", 10);
const trustedWebOrigins = parseTrustedWebOrigins();

const app = next({ dev, hostname, port, dir: appDirectory });
const handler = app.getRequestHandler();

app.prepare().then(async () => {
    let socketRedisAdapter: SocketRedisAdapterHandle | null = null;
    let roomOwnership: RoomOwnershipCoordinator | null = null;
    const socketRedisAdapterConfig = getSocketRedisAdapterConfig();
    const roomOwnershipConfig = getRoomOwnershipConfig();
    const httpServer = createServer(async (req, res) => {
        if (req.url !== "/api/health" || req.method !== "GET") {
            await handler(req, res);
            return;
        }

        const requestHeaders = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === "string") {
                requestHeaders.set(key, value);
            } else if (Array.isArray(value)) {
                requestHeaders.set(key, value.join(", "));
            }
        }

        if (!isHealthEndpointAllowed(requestHeaders, dev)) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found" }));
            return;
        }

        const metrics = getRoomMetrics();
        const redis = await getRedisHealth();
        const socketRedisAdapterStatus =
            socketRedisAdapter?.getStatus() ?? {
                enabled: socketRedisAdapterConfig.enabled,
                available: false,
                redisConfigured: socketRedisAdapterConfig.redisConfigured,
                stickySessionsConfigured:
                    socketRedisAdapterConfig.stickySessionsConfigured,
                roomStateBackend: "process-local" as const,
                multiInstanceReady: false as const,
            };
        const roomOwnershipStatus = roomOwnership?.getStatus() ?? {
            enabled: roomOwnershipConfig.enabled,
            available: false,
            instanceId: getCapacityInstanceId(),
            leaseTtlMs: roomOwnershipConfig.leaseTtlMs,
            renewIntervalMs: roomOwnershipConfig.renewIntervalMs,
            trackedRooms: 0,
            ownedRooms: 0,
            lostRooms: 0,
            claimConflicts: 0,
            lostOwnerships: 0,
            renewFailures: 0,
            lastRenewedAt: null,
            enforcement: "create-only" as const,
        };
        const realtimeDegraded =
            (socketRedisAdapterStatus.enabled &&
                !socketRedisAdapterStatus.available) ||
            (roomOwnershipStatus.enabled && !roomOwnershipStatus.available) ||
            roomOwnershipStatus.lostRooms > 0;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                status: realtimeDegraded ? "degraded" : "ok",
                uptime: process.uptime(),
                dependencies: {
                    redis,
                },
                realtime: {
                    socketRedisAdapter: socketRedisAdapterStatus,
                    roomOwnership: roomOwnershipStatus,
                },
                ...metrics,
            })
        );
    });

    const io = new Server(httpServer, {
        path: "/api/socketio",
        cors: {
            origin(origin, callback) {
                const allowed = isTrustedWebOrigin({
                    origin,
                    isDev: dev,
                    trustedOrigins: trustedWebOrigins,
                    allowMissingOrigin: allowOriginlessSocketClients(dev),
                });
                callback(allowed ? null : new Error("Origin not allowed"), allowed);
            },
            methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
    });
    socketRedisAdapter = await configureSocketRedisAdapter(io);
    if (socketRedisAdapter.getStatus().enabled) {
        console.warn(
            "Socket.IO Redis adapter enabled. Room state remains process-local; do not scale realtime replicas yet."
        );
        if (!socketRedisAdapter.getStatus().stickySessionsConfigured) {
            console.warn(
                "Socket.IO polling requires sticky sessions before traffic can be distributed across realtime instances."
            );
        }
    }
    roomOwnership = await createRoomOwnershipCoordinator({
        instanceId: getCapacityInstanceId(),
    });

    // Resolve auth when present, but keep guest socket access open.
    io.use(async (socket, nextMiddleware) => {
        try {
            const token = process.env.AUTH_SECRET
                ? await getToken({
                    req: { headers: socket.request.headers } as never,
                    secret: process.env.AUTH_SECRET,
                    secureCookie: process.env.NODE_ENV === "production",
                })
                : null;

            socket.data.userId = token?.sub ?? null;
            nextMiddleware();
        } catch (error) {
            console.error("Socket authentication failed, continuing as guest:", error);
            socket.data.userId = null;
            nextMiddleware();
        }
    });

    setupGameSocket(io, roomOwnership);
    const publishCurrentCapacity = () => {
        void publishCapacityHeartbeat(getLocalRoomCapacityMetrics()).catch(
            (error) => {
                console.error("Capacity heartbeat could not be published", error);
            }
        );
    };
    publishCurrentCapacity();
    const capacityHeartbeat = setInterval(publishCurrentCapacity, 10_000);
    capacityHeartbeat.unref();
    const ownershipHeartbeat = roomOwnership.getConfig().enabled
        ? setInterval(() => {
              void roomOwnership?.renewOwnedRooms().catch((error) => {
                  console.error("Room ownership heartbeat failed", error);
              });
          }, roomOwnership.getConfig().renewIntervalMs)
        : null;
    ownershipHeartbeat?.unref();

    httpServer.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });

    let shuttingDown = false;
    const shutdown = async () => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log("Shutting down...");
        clearInterval(capacityHeartbeat);
        if (ownershipHeartbeat) clearInterval(ownershipHeartbeat);
        await new Promise<void>((resolve) => {
            io.close(() => resolve());
        });
        await socketRedisAdapter?.close();
        await roomOwnership?.close();
        await removeCapacityHeartbeat();
        await closeRedisClient();
        if (!httpServer.listening) {
            process.exit(0);
            return;
        }
        httpServer.close(() => process.exit(0));
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}).catch((error) => {
    console.error("Web runtime startup failed", error);
    process.exit(1);
});
