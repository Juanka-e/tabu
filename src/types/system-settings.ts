export const CAPTCHA_PROVIDERS = ["none", "turnstile", "recaptcha_v3"] as const;
export type CaptchaProvider = (typeof CAPTCHA_PROVIDERS)[number];

export const CAPTCHA_FAIL_MODES = ["soft_fail", "hard_fail"] as const;
export type CaptchaFailMode = (typeof CAPTCHA_FAIL_MODES)[number];

export const CAPTCHA_TURNSTILE_MODES = [
    "invisible",
    "non_interactive",
    "managed",
] as const;
export type CaptchaTurnstileMode = (typeof CAPTCHA_TURNSTILE_MODES)[number];

export interface PlatformSettings {
    maintenanceEnabled: boolean;
    maintenanceMessage: string;
    motdEnabled: boolean;
    motdText: string;
}

export interface BrandingSettings {
    siteName: string;
    siteShortName: string;
    logoUrl: string;
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription: string;
    ogImageUrl: string;
    faviconUrl: string;
    themeColor: string;
    twitterHandle: string;
}

export interface FeatureSettings {
    registrationsEnabled: boolean;
    guestGameplayEnabled: boolean;
    roomCreateEnabled: boolean;
    roomJoinEnabled: boolean;
    storeEnabled: boolean;
}

export interface EconomySettings {
    startingCoinBalance: number;
    winRewardCoin: number;
    lossRewardCoin: number;
    drawRewardCoin: number;
    matchCoinMultiplier: number;
    weekendCoinMultiplierEnabled: boolean;
    weekendCoinMultiplier: number;
    storePriceMultiplier: number;
    bundlesEnabled: boolean;
    discountCampaignsEnabled: boolean;
    couponsEnabled: boolean;
}

export interface CaptchaSettings {
    enabled: boolean;
    provider: CaptchaProvider;
    onRegister: boolean;
    onGuestJoin: boolean;
    onRoomCreate: boolean;
    onLogin: boolean;
    failMode: CaptchaFailMode;
    turnstileMode: CaptchaTurnstileMode;
    recaptchaScoreThreshold: number;
    turnstileInteractiveFallback: boolean;
}

export interface SecuritySettings {
    captcha: CaptchaSettings;
}

export interface SystemSettings {
    platform: PlatformSettings;
    branding: BrandingSettings;
    features: FeatureSettings;
    economy: EconomySettings;
    security: SecuritySettings;
}

export interface CaptchaProviderReadiness {
    turnstileConfigured: boolean;
    recaptchaConfigured: boolean;
}

export interface SystemSettingsResponse {
    settings: SystemSettings;
    captchaReadiness: CaptchaProviderReadiness;
    namespaces: Array<keyof SystemSettings>;
}
