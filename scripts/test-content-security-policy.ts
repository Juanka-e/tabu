import assert from "node:assert/strict";
import { buildContentSecurityPolicy } from "../src/lib/security/content-security-policy";

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
