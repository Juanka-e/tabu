import assert from "node:assert/strict";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    resetRequestRateLimitBuckets,
} from "../src/lib/security/request-rate-limit";
import { isTrustedStateChangeRequest } from "../src/lib/security/request-origin";

const sameOriginRequest = {
    headers: new Headers({
        origin: "https://tabu.example.com",
    }),
    method: "POST",
    url: "https://tabu.example.com/api/store/purchase",
};

const crossOriginRequest = {
    headers: new Headers({
        origin: "https://attacker.example.com",
    }),
    method: "POST",
    url: "https://tabu.example.com/api/store/purchase",
};

assert.equal(isTrustedStateChangeRequest(sameOriginRequest), true);
assert.equal(isTrustedStateChangeRequest(crossOriginRequest), false);

resetRequestRateLimitBuckets();

const first = consumeRequestRateLimit({
    bucket: "test-security",
    key: "user:1",
    windowMs: 60_000,
    maxRequests: 2,
});
assert.equal(first.allowed, true);
assert.equal(first.remaining, 1);

const second = consumeRequestRateLimit({
    bucket: "test-security",
    key: "user:1",
    windowMs: 60_000,
    maxRequests: 2,
});
assert.equal(second.allowed, true);
assert.equal(second.remaining, 0);

const third = consumeRequestRateLimit({
    bucket: "test-security",
    key: "user:1",
    windowMs: 60_000,
    maxRequests: 2,
});
assert.equal(third.allowed, false);

const headers = buildRateLimitHeaders(third);
assert.equal(headers["Retry-After"], String(third.retryAfterSeconds));
assert.equal(headers["X-RateLimit-Limit"], "2");
assert.equal(headers["X-RateLimit-Remaining"], "0");

console.log("request security smoke test passed");
