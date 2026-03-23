import assert from "node:assert/strict";
import { isAutomaticBrandingPreviewUrl } from "@/lib/branding/assets";
import {
    consumeRequestRateLimit,
    resetRequestRateLimitBuckets,
} from "@/lib/security/request-rate-limit";

function main() {
    resetRequestRateLimitBuckets();

    const first = consumeRequestRateLimit({
        bucket: "admin-system-settings-write-test",
        key: "7:127.0.0.1",
        windowMs: 60_000,
        maxRequests: 2,
    });
    const second = consumeRequestRateLimit({
        bucket: "admin-system-settings-write-test",
        key: "7:127.0.0.1",
        windowMs: 60_000,
        maxRequests: 2,
    });
    const third = consumeRequestRateLimit({
        bucket: "admin-system-settings-write-test",
        key: "7:127.0.0.1",
        windowMs: 60_000,
        maxRequests: 2,
    });

    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
    assert.equal(isAutomaticBrandingPreviewUrl("/uploads/branding/og-cover.webp"), true);
    assert.equal(isAutomaticBrandingPreviewUrl("//cdn.example.com/og-cover.webp"), false);
    assert.equal(isAutomaticBrandingPreviewUrl("https://cdn.example.com/og-cover.webp"), false);

    console.log("system settings hardening smoke test passed");
}

main();
