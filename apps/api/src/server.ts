import { createServer } from "node:http";
import { getMobileApiRuntimeConfig } from "./config";
import { createMobileApiHttpHandler } from "./http-app";

const config = getMobileApiRuntimeConfig();
const server = createServer(
    createMobileApiHttpHandler({
        allowedOrigins: config.allowedOrigins,
    })
);

server.listen(config.port, config.host, () => {
    console.log(
        `[api] listening on http://${config.host}:${config.port}`
    );
});

function shutdown(signal: string): void {
    console.log(`[api] received ${signal}; shutting down`);
    server.close((error) => {
        if (error) {
            console.error("[api] shutdown failed", error);
            process.exitCode = 1;
        }
    });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
