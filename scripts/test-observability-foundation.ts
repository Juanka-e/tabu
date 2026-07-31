import assert from "node:assert/strict";
import { onRequestError } from "../apps/web/src/instrumentation";
import {
    configureObservabilityExporter,
    emitObservabilityEvent,
    flushObservabilityExporter,
    getObservabilityStatus,
    getOrCreateRequestId,
    isValidRequestId,
    reportError,
    resetObservabilityForTests,
    type ObservabilityEvent,
} from "@hushle/platform-observability";

async function main(): Promise<void> {
    const lines: string[] = [];
    resetObservabilityForTests({
        sink: (_level, line) => lines.push(line),
    });

    assert.equal(getOrCreateRequestId("request.valid-1"), "request.valid-1");
    const generatedId = getOrCreateRequestId("spaces are rejected");
    assert.equal(isValidRequestId(generatedId), true);
    assert.notEqual(generatedId, "spaces are rejected");

    const exported: ObservabilityEvent[] = [];
    configureObservabilityExporter({
        capture(event) {
            exported.push(event);
        },
    });

    const secret = "database-password-value";
    await reportError({
        service: "hushle-web",
        event: "test.failure",
        requestId: "request.valid-1",
        error: new Error(`mysql://hushle:${secret}@mysql:3306/hushle`),
        context: {
            method: "POST",
            path: "/api/test",
            email: "player@example.test",
            note: "player@example.test Bearer abc.def.ghi token=unsafe-value",
            nested: { unsafe: true },
        },
    });

    assert.equal(lines.length, 1);
    assert.equal(exported.length, 1);
    const serialized = lines[0] ?? "";
    assert.equal(serialized.includes(secret), false);
    assert.equal(serialized.includes("player@example.test"), false);
    assert.equal(serialized.includes("abc.def.ghi"), false);
    assert.equal(serialized.includes("unsafe-value"), false);

    const parsed = JSON.parse(serialized) as ObservabilityEvent;
    assert.equal(parsed.level, "error");
    assert.equal(parsed.service, "hushle-web");
    assert.equal(parsed.event, "test.failure");
    assert.equal(parsed.requestId, "request.valid-1");
    assert.deepEqual(parsed.context?.method, "POST");
    assert.equal("email" in (parsed.context ?? {}), false);
    assert.equal("nested" in (parsed.context ?? {}), false);

    configureObservabilityExporter({
        capture() {
            throw new Error("provider unavailable");
        },
    });
    await emitObservabilityEvent({
        level: "warn",
        service: "hushle-api",
        event: "exporter.test",
    });

    const status = getObservabilityStatus();
    assert.equal(status.emitted, 2);
    assert.equal(status.errors, 1);
    assert.equal(status.warnings, 1);
    assert.equal(status.exporterConfigured, true);
    assert.equal(status.exporterFailures, 1);
    assert.ok(status.droppedContextFields >= 2);
    assert.ok(status.lastErrorAt);

    configureObservabilityExporter({
        async capture() {
            throw new Error("async provider unavailable");
        },
    });
    await emitObservabilityEvent({
        level: "info",
        service: "hushle-web",
        event: "exporter.async_test",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(getObservabilityStatus().exporterFailures, 2);

    configureObservabilityExporter({
        capture() {},
        async flush() {
            await new Promise((resolve) => setTimeout(resolve, 20));
        },
    });
    assert.equal(await flushObservabilityExporter(100), true);
    configureObservabilityExporter({
        capture() {},
        async flush() {
            await new Promise(() => undefined);
        },
    });
    assert.equal(await flushObservabilityExporter(5), false);
    assert.equal(getObservabilityStatus().exporterFailures, 3);

    const hookLines: string[] = [];
    resetObservabilityForTests({
        sink: (_level, line) => hookLines.push(line),
    });
    await onRequestError(
        Object.assign(new Error("render failed"), { digest: "digest-1" }),
        {
            path: "/admin?private=value",
            method: "GET",
            headers: { "x-request-id": "next-hook-1" },
        },
        {
            routerKind: "App Router",
            routePath: "/admin",
            routeType: "render",
            renderSource: "server-rendering",
            revalidateReason: undefined,
        }
    );
    assert.equal(hookLines.length, 1);
    const hookEvent = JSON.parse(hookLines[0] ?? "") as ObservabilityEvent;
    assert.equal(hookEvent.event, "next.request.uncaught");
    assert.equal(hookEvent.requestId, "next-hook-1");
    assert.equal(JSON.stringify(hookEvent).includes("private=value"), false);

    console.log("observability foundation tests passed");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
