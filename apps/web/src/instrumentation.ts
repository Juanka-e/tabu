import type { Instrumentation } from "next";
import {
    isValidRequestId,
    reportError,
} from "@hushle/platform-observability";

export const onRequestError: Instrumentation.onRequestError = async (
    error,
    request,
    context
) => {
    const requestIdHeader = request.headers["x-request-id"];
    const requestId = Array.isArray(requestIdHeader)
        ? requestIdHeader[0]
        : requestIdHeader;

    await reportError({
        service: "hushle-web",
        event: "next.request.uncaught",
        requestId: isValidRequestId(requestId) ? requestId : undefined,
        error,
        context: {
            method: request.method,
            routePath: context.routePath,
            routeType: context.routeType,
            routerKind: context.routerKind,
            renderSource: context.renderSource,
        },
    });
};
