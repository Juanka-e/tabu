import assert from "node:assert/strict";
import {
    buildContentSecurityPolicy,
    getConfiguredCspSources,
} from "../apps/web/src/lib/security/content-security-policy";

const prodPolicy = buildContentSecurityPolicy({
    nonce: "test-nonce",
    isDev: false,
});

assert.match(
    prodPolicy,
    /script-src 'self' 'nonce-test-nonce' 'strict-dynamic'/
);
assert.match(prodPolicy, /script-src-attr 'none'/);
assert.match(
    prodPolicy,
    /frame-src 'self' https:\/\/www\.youtube\.com https:\/\/www\.youtube-nocookie\.com/
);
assert.match(prodPolicy, /frame-ancestors 'none'/);
assert.match(prodPolicy, /upgrade-insecure-requests/);
assert.ok(!prodPolicy.includes("'unsafe-eval'"));

const externalSourcePolicy = buildContentSecurityPolicy({
    nonce: "external-sources",
    isDev: false,
    externalSources: {
        styles: ["https://fonts.googleapis.com"],
        fonts: ["https://fonts.gstatic.com"],
        connections: ["https://api.example.com"],
    },
});
assert.match(externalSourcePolicy, /style-src[^;]+https:\/\/fonts\.googleapis\.com/);
assert.match(externalSourcePolicy, /font-src[^;]+https:\/\/fonts\.gstatic\.com/);
assert.match(externalSourcePolicy, /connect-src[^;]+https:\/\/api\.example\.com/);

assert.deepEqual(
    getConfiguredCspSources(false, {
        CSP_STYLE_SOURCES: "https://fonts.googleapis.com",
        CSP_FONT_SOURCES: "https://fonts.gstatic.com",
        CSP_CONNECT_SOURCES:
            "https://api.example.com,wss://socket.example.com",
    }),
    {
        styles: ["https://fonts.googleapis.com"],
        fonts: ["https://fonts.gstatic.com"],
        connections: [
            "https://api.example.com",
            "wss://socket.example.com",
        ],
    }
);
assert.throws(
    () =>
        getConfiguredCspSources(false, {
            CSP_FONT_SOURCES: "http://fonts.example.com",
        }),
    /Unsupported CSP source protocol/
);

const devPolicy = buildContentSecurityPolicy({
    nonce: "test-dev",
    isDev: true,
});

assert.match(
    devPolicy,
    /script-src 'self' 'nonce-test-dev' 'strict-dynamic' 'unsafe-eval'/
);
assert.ok(!devPolicy.includes("upgrade-insecure-requests"));

console.log("content security policy smoke test passed");
