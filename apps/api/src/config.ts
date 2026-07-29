export interface MobileApiRuntimeConfig {
    host: string;
    port: number;
    allowedOrigins: ReadonlySet<string>;
}

function parsePort(value: string | undefined): number {
    const port = Number(value ?? "3001");
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error("API_PORT must be an integer between 1 and 65535.");
    }
    return port;
}

export function parseApiAllowedOrigins(
    value: string | undefined,
    nodeEnv: string | undefined
): ReadonlySet<string> {
    const configured = (value ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    if (configured.includes("*")) {
        throw new Error("API_ALLOWED_ORIGINS must use exact origins; wildcard is forbidden.");
    }

    if (configured.length > 0) {
        return new Set(configured);
    }
    if (nodeEnv !== "production") {
        return new Set([
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]);
    }
    return new Set();
}

export function getMobileApiRuntimeConfig(
    env: NodeJS.ProcessEnv = process.env
): MobileApiRuntimeConfig {
    return {
        host: env.API_HOST?.trim() || "127.0.0.1",
        port: parsePort(env.API_PORT),
        allowedOrigins: parseApiAllowedOrigins(
            env.API_ALLOWED_ORIGINS,
            env.NODE_ENV
        ),
    };
}
