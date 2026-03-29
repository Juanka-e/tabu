import assert from "node:assert/strict";
import {
    DEFAULT_SYSTEM_SETTINGS,
    normalizeSystemSettings,
} from "../src/lib/system-settings/schema";
import {
    evaluateRoomRequestPolicy,
    getFeatureDisabledMessage,
    isRegistrationAvailable,
    isStoreAvailable,
} from "../src/lib/system-settings/policies";
import { getCaptchaProviderReadiness } from "../src/lib/system-settings/service";

const defaults = normalizeSystemSettings({});
assert.deepEqual(defaults, DEFAULT_SYSTEM_SETTINGS);
assert.equal(isRegistrationAvailable(defaults), true);
assert.equal(isStoreAvailable(defaults), true);
assert.equal(getFeatureDisabledMessage("store"), "Magaza su anda kullanima kapali.");

const maintenanceSettings = normalizeSystemSettings({
    platform: {
        maintenanceEnabled: true,
        maintenanceMessage: "Bakim var.",
        motdEnabled: false,
        motdText: "",
    },
});

const guestDenied = evaluateRoomRequestPolicy({
    settings: normalizeSystemSettings({
        features: {
            registrationsEnabled: true,
            guestGameplayEnabled: false,
            roomCreateEnabled: true,
            roomJoinEnabled: true,
            storeEnabled: true,
        },
    }),
    isAuthenticated: false,
    isAdmin: false,
    isCreateRequest: false,
    isReconnect: false,
});
assert.equal(guestDenied.allowed, false);
assert.equal(guestDenied.message, "Misafir girisi su anda kapali.");

const maintenanceDenied = evaluateRoomRequestPolicy({
    settings: maintenanceSettings,
    isAuthenticated: true,
    isAdmin: false,
    isCreateRequest: true,
    isReconnect: false,
});
assert.equal(maintenanceDenied.allowed, false);
assert.equal(maintenanceDenied.message, "Bakim var.");

const reconnectAllowed = evaluateRoomRequestPolicy({
    settings: maintenanceSettings,
    isAuthenticated: true,
    isAdmin: false,
    isCreateRequest: false,
    isReconnect: true,
});
assert.equal(reconnectAllowed.allowed, true);

const originalTurnstileSiteKey = process.env.TURNSTILE_SITE_KEY;
const originalTurnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;
process.env.TURNSTILE_SITE_KEY = "site";
process.env.TURNSTILE_SECRET_KEY = "secret";
assert.equal(getCaptchaProviderReadiness().turnstileConfigured, true);
if (originalTurnstileSiteKey === undefined) {
    delete process.env.TURNSTILE_SITE_KEY;
} else {
    process.env.TURNSTILE_SITE_KEY = originalTurnstileSiteKey;
}
if (originalTurnstileSecretKey === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
} else {
    process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecretKey;
}

console.log("system settings smoke test passed");
