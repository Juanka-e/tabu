import assert from "node:assert/strict";
import { DEFAULT_SYSTEM_SETTINGS, normalizeSystemSettings } from "../src/lib/system-settings/schema";
import {
    getPublicCaptchaConfigForAction,
    isCaptchaRequiredForAction,
    verifyCaptchaForAction,
} from "../src/lib/security/captcha";

async function main(): Promise<void> {
    const defaults = normalizeSystemSettings({});
    assert.equal(isCaptchaRequiredForAction(defaults, "register"), false);

    const enforcedSettings = normalizeSystemSettings({
        security: {
            captcha: {
                enabled: true,
                provider: "turnstile",
                onRegister: true,
                onGuestJoin: true,
                onRoomCreate: true,
                onLogin: true,
                failMode: "soft_fail",
                recaptchaScoreThreshold: 0.5,
                turnstileInteractiveFallback: true,
            },
        },
    });

    const publicConfig = getPublicCaptchaConfigForAction(enforcedSettings, "register");
    assert.equal(publicConfig.required, true);
    assert.equal(publicConfig.provider, "turnstile");

    const softFailResult = await verifyCaptchaForAction({
        action: "register",
        token: null,
        settings: normalizeSystemSettings({
            security: {
                captcha: {
                    enabled: true,
                    provider: "turnstile",
                    onRegister: true,
                    onGuestJoin: false,
                    onRoomCreate: false,
                    onLogin: false,
                    failMode: "soft_fail",
                    recaptchaScoreThreshold: 0.5,
                    turnstileInteractiveFallback: true,
                },
            },
        }),
    });
    assert.equal(softFailResult.ok, true);
    assert.equal(softFailResult.softPassed, true);
    assert.equal(softFailResult.reason, "provider_unconfigured");

    const hardFailResult = await verifyCaptchaForAction({
        action: "register",
        token: null,
        settings: normalizeSystemSettings({
            security: {
                captcha: {
                    enabled: true,
                    provider: "turnstile",
                    onRegister: true,
                    onGuestJoin: false,
                    onRoomCreate: false,
                    onLogin: false,
                    failMode: "hard_fail",
                    recaptchaScoreThreshold: 0.5,
                    turnstileInteractiveFallback: true,
                },
            },
        }),
    });
    assert.equal(hardFailResult.ok, false);
    assert.equal(hardFailResult.reason, "provider_unconfigured");

    const disabledResult = await verifyCaptchaForAction({
        action: "login",
        token: null,
        settings: DEFAULT_SYSTEM_SETTINGS,
    });
    assert.equal(disabledResult.ok, true);
    assert.equal(disabledResult.reason, "not_required");

    console.log("captcha security smoke test passed");
}

void main();
