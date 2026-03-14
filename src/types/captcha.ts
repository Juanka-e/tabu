import type { CaptchaFailMode, CaptchaProvider } from "@/types/system-settings";

export const CAPTCHA_ACTIONS = [
    "register",
    "login",
    "room_create",
    "guest_join",
] as const;

export type CaptchaAction = (typeof CAPTCHA_ACTIONS)[number];

export interface PublicCaptchaConfig {
    enabled: boolean;
    required: boolean;
    provider: CaptchaProvider;
    siteKey: string | null;
    failMode: CaptchaFailMode;
    turnstileInteractiveFallback: boolean;
}

export interface CaptchaVerificationResult {
    ok: boolean;
    softPassed: boolean;
    provider: CaptchaProvider;
    reason:
        | "not_required"
        | "provider_unconfigured"
        | "provider_unavailable"
        | "missing_token"
        | "verification_failed"
        | "action_mismatch"
        | "low_score"
        | "verified";
    score?: number | null;
}
