export const MOBILE_API_VERSION = "v1" as const;

export const MOBILE_API_ROUTES = {
    health: "/health",
    meta: `/${MOBILE_API_VERSION}/meta`,
} as const;

export type MobileApiCapabilityStatus =
    | "available"
    | "planned"
    | "web_runtime_only";

export interface MobileApiMeta {
    apiVersion: typeof MOBILE_API_VERSION;
    requestId: string;
}

export interface MobileApiSuccess<T> {
    ok: true;
    data: T;
    meta: MobileApiMeta;
}

export interface MobileApiError {
    ok: false;
    error: {
        code:
            | "cors_denied"
            | "invalid_request"
            | "method_not_allowed"
            | "not_found"
            | "internal_error";
        message: string;
    };
    meta: MobileApiMeta;
}

export interface MobileApiHealthData {
    service: "hushle-api";
    status: "ok";
}

export interface MobileApiRuntimeMetaData {
    service: "hushle-api";
    apiVersion: typeof MOBILE_API_VERSION;
    capabilities: {
        runtimeMeta: MobileApiCapabilityStatus;
        bearerAuth: MobileApiCapabilityStatus;
        profile: MobileApiCapabilityStatus;
        inventory: MobileApiCapabilityStatus;
        progression: MobileApiCapabilityStatus;
        realtimeGameplay: MobileApiCapabilityStatus;
        admin: MobileApiCapabilityStatus;
    };
}

export function buildMobileApiSuccess<T>(
    data: T,
    requestId: string
): MobileApiSuccess<T> {
    return {
        ok: true,
        data,
        meta: {
            apiVersion: MOBILE_API_VERSION,
            requestId,
        },
    };
}

export function buildMobileApiError(
    code: MobileApiError["error"]["code"],
    message: string,
    requestId: string
): MobileApiError {
    return {
        ok: false,
        error: { code, message },
        meta: {
            apiVersion: MOBILE_API_VERSION,
            requestId,
        },
    };
}
