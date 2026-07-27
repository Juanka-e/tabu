const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface OriginCheckRequest {
    headers: Headers;
    method: string;
    url: string;
}

export function isTrustedStateChangeRequest(request: OriginCheckRequest): boolean {
    if (!STATE_CHANGING_METHODS.has(request.method.toUpperCase())) {
        return true;
    }

    const originHeader = request.headers.get("origin");
    const fetchSiteHeader = request.headers.get("sec-fetch-site");
    const expectedOrigin = new URL(request.url).origin;

    if (originHeader) {
        try {
            return new URL(originHeader).origin === expectedOrigin;
        } catch {
            return false;
        }
    }

    if (!fetchSiteHeader) {
        return true;
    }

    return fetchSiteHeader === "same-origin" || fetchSiteHeader === "none";
}
