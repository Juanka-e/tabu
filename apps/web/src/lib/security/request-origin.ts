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

    if (originHeader) {
        try {
            const requestUrl = new URL(request.url);
            const expectedOrigins = new Set([requestUrl.origin]);
            const forwardedProto = request.headers
                .get("x-forwarded-proto")
                ?.split(",", 1)[0]
                ?.trim();
            const protocol = forwardedProto
                ? `${forwardedProto.replace(/:$/, "")}:`
                : requestUrl.protocol;
            const forwardedHost = request.headers
                .get("x-forwarded-host")
                ?.split(",", 1)[0]
                ?.trim();
            const host = forwardedHost || request.headers.get("host")?.trim();

            if (host && (protocol === "http:" || protocol === "https:")) {
                expectedOrigins.add(new URL(`${protocol}//${host}`).origin);
            }

            return expectedOrigins.has(new URL(originHeader).origin);
        } catch {
            return false;
        }
    }

    if (!fetchSiteHeader) {
        return true;
    }

    return fetchSiteHeader === "same-origin" || fetchSiteHeader === "none";
}
