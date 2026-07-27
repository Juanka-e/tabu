import { createServer } from "http";
import { loadEnvConfig } from "@next/env";
import next from "next";
import { Server } from "socket.io";
import { getToken } from "next-auth/jwt";
import { fileURLToPath } from "node:url";
import { setupGameSocket, getRoomMetrics } from "./src/lib/socket/game-socket";
import { isHealthEndpointAllowed } from "./src/lib/security/health-check";
import { closeRedisClient, getRedisHealth } from "@hushle/platform-cache";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
loadEnvConfig(workspaceRoot, process.env.NODE_ENV !== "production");
process.chdir(appDirectory);

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || (dev ? "localhost" : "127.0.0.1");
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port, dir: appDirectory });
const handler = app.getRequestHandler();

app.prepare().then(() => {
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
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                status: "ok",
                uptime: process.uptime(),
                dependencies: {
                    redis,
                },
                ...metrics,
            })
        );
    });

    const io = new Server(httpServer, {
        path: "/api/socketio",
        cors: {
            origin: dev ? "*" : process.env.NEXT_PUBLIC_SITE_URL,
            methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
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

    setupGameSocket(io);

    httpServer.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });

    const shutdown = async () => {
        console.log("Shutting down...");
        io.close();
        await closeRedisClient();
        httpServer.close(() => {
            process.exit(0);
        });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
});
