import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    buildMobileApiError,
    buildMobileApiSuccess,
    MOBILE_API_ROUTES,
    MOBILE_API_VERSION,
    type MobileApiHealthData,
    type MobileApiRuntimeMetaData,
} from "@hushle/api-contracts";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

export interface MobileApiHttpOptions {
    allowedOrigins: ReadonlySet<string>;
}

function getRequestId(request: IncomingMessage): string {
    const candidate = request.headers["x-request-id"];
    if (
        typeof candidate === "string" &&
        REQUEST_ID_PATTERN.test(candidate)
    ) {
        return candidate;
    }
    return randomUUID();
}

function appendVary(response: ServerResponse, value: string): void {
    const existing = response.getHeader("Vary");
    const values = new Set(
        (typeof existing === "string" ? existing.split(",") : [])
            .map((entry) => entry.trim())
            .filter(Boolean)
    );
    values.add(value);
    response.setHeader("Vary", [...values].join(", "));
}

function applyBaseHeaders(response: ServerResponse, requestId: string): void {
    response.setHeader("Content-Type", JSON_CONTENT_TYPE);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Request-Id", requestId);
    response.setHeader("X-Api-Version", MOBILE_API_VERSION);
}

function applyCorsHeaders(
    request: IncomingMessage,
    response: ServerResponse,
    allowedOrigins: ReadonlySet<string>
): boolean {
    const origin = request.headers.origin;
    if (!origin) {
        return true;
    }

    appendVary(response, "Origin");
    if (!allowedOrigins.has(origin)) {
        return false;
    }

    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, X-Request-Id"
    );
    response.setHeader(
        "Access-Control-Expose-Headers",
        "X-Api-Version, X-Request-Id"
    );
    response.setHeader("Access-Control-Max-Age", "600");
    return true;
}

function sendJson(
    response: ServerResponse,
    statusCode: number,
    payload: unknown
): void {
    response.statusCode = statusCode;
    response.end(JSON.stringify(payload));
}

export function createMobileApiHttpHandler(options: MobileApiHttpOptions) {
    return (request: IncomingMessage, response: ServerResponse): void => {
        const requestId = getRequestId(request);
        applyBaseHeaders(response, requestId);

        if (!applyCorsHeaders(request, response, options.allowedOrigins)) {
            sendJson(
                response,
                403,
                buildMobileApiError(
                    "cors_denied",
                    "Request origin is not allowed.",
                    requestId
                )
            );
            return;
        }

        if (request.method === "OPTIONS") {
            response.statusCode = 204;
            response.removeHeader("Content-Type");
            response.end();
            return;
        }

        let url: URL;
        try {
            url = new URL(request.url ?? "/", "http://api.internal");
        } catch {
            sendJson(
                response,
                400,
                buildMobileApiError(
                    "invalid_request",
                    "Request URL is invalid.",
                    requestId
                )
            );
            return;
        }
        const knownRoute =
            url.pathname === MOBILE_API_ROUTES.health ||
            url.pathname === MOBILE_API_ROUTES.meta;
        if (knownRoute && request.method !== "GET") {
            response.setHeader("Allow", "GET, OPTIONS");
            sendJson(
                response,
                405,
                buildMobileApiError(
                    "method_not_allowed",
                    "Method is not allowed for this endpoint.",
                    requestId
                )
            );
            return;
        }

        if (request.method === "GET" && url.pathname === MOBILE_API_ROUTES.health) {
            const data: MobileApiHealthData = {
                service: "hushle-api",
                status: "ok",
            };
            sendJson(response, 200, buildMobileApiSuccess(data, requestId));
            return;
        }

        if (request.method === "GET" && url.pathname === MOBILE_API_ROUTES.meta) {
            const data: MobileApiRuntimeMetaData = {
                service: "hushle-api",
                apiVersion: MOBILE_API_VERSION,
                capabilities: {
                    runtimeMeta: "available",
                    bearerAuth: "planned",
                    profile: "planned",
                    inventory: "planned",
                    progression: "planned",
                    realtimeGameplay: "web_runtime_only",
                    admin: "web_runtime_only",
                },
            };
            sendJson(response, 200, buildMobileApiSuccess(data, requestId));
            return;
        }

        sendJson(
            response,
            404,
            buildMobileApiError(
                "not_found",
                "Endpoint was not found.",
                requestId
            )
        );
    };
}
