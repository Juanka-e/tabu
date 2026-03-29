import assert from "node:assert/strict";
import { getIntegrationHubSnapshot } from "../src/lib/integrations/service";
import { normalizeSystemSettings } from "../src/lib/system-settings/schema";

async function main(): Promise<void> {
    process.env.DATABASE_URL = "mysql://root:@localhost:3306/tabu2";
    process.env.AUTH_SECRET = "this_is_a_long_enough_auth_secret_value_123456";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.TURNSTILE_SITE_KEY = "site";
    process.env.TURNSTILE_SECRET_KEY = "secret";
    process.env.RECAPTCHA_SITE_KEY = "";
    process.env.RECAPTCHA_SECRET_KEY = "";
    process.env.ADMIN_ACCESS_MODE = "restricted_login";
    process.env.ADMIN_ACCESS_FAIL_CLOSED = "true";
    process.env.ADMIN_ACCESS_ALLOW_LOCAL_DEV_BYPASS = "false";
    process.env.ADMIN_ACCESS_HEADER_NAME = "x-admin-access";
    process.env.ADMIN_ACCESS_HEADER_VALUE = "approved";
    process.env.ADMIN_ACCESS_EMAIL_HEADER_NAME = "";
    process.env.ADMIN_ACCESS_ALLOWED_EMAILS = "";
    process.env.ADMIN_ACCESS_ALLOWED_EMAIL_DOMAINS = "";

    const settings = normalizeSystemSettings({
        security: {
            captcha: {
                enabled: true,
                provider: "turnstile",
                onRegister: true,
                onGuestJoin: false,
                onRoomCreate: true,
                onLogin: true,
                failMode: "hard_fail",
                turnstileMode: "invisible",
                recaptchaScoreThreshold: 0.5,
                turnstileInteractiveFallback: true,
            },
        },
    });

    const snapshot = await getIntegrationHubSnapshot({ settings });

    const turnstile = snapshot.items.find((item) => item.id === "turnstile");
    const adminAccess = snapshot.items.find((item) => item.id === "admin-access-gateway");
    const emailOutbound = snapshot.items.find((item) => item.id === "email-outbound");
    const redis = snapshot.items.find((item) => item.id === "redis-valkey");

    assert.ok(turnstile);
    assert.equal(turnstile.status, "ready");

    assert.ok(adminAccess);
    assert.equal(adminAccess.status, "ready");

    assert.ok(emailOutbound);
    assert.equal(emailOutbound.status, "planned");

    assert.ok(redis);
    assert.equal(redis.status, "planned");

    console.log("integration hub smoke test passed");
}

void main();
