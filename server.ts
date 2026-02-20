import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { setupGameSocket, getRoomMetrics } from "./src/lib/socket/game-socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handler);

    const io = new Server(httpServer, {
        path: "/api/socketio",
        cors: {
            origin: dev ? "*" : process.env.NEXT_PUBLIC_SITE_URL,
            methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
    });

    // Initialize game socket logic
    setupGameSocket(io);

    // Health check endpoint (accessible via custom server)
    httpServer.on("request", (req, res) => {
        if (req.url === "/api/health" && req.method === "GET") {
            const metrics = getRoomMetrics();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    status: "ok",
                    uptime: process.uptime(),
                    ...metrics,
                })
            );
        }
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });

    // Graceful shutdown
    const shutdown = () => {
        console.log("Shutting down...");
        io.close();
        httpServer.close(() => {
            process.exit(0);
        });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
});
