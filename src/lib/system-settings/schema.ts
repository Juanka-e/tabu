import { z } from "zod";
import {
    CAPTCHA_FAIL_MODES,
    CAPTCHA_PROVIDERS,
    type SystemSettings,
} from "@/types/system-settings";

const trimmedShortText = z.string().trim().max(240);
const trimmedLongText = z.string().trim().max(400);

const platformSettingsSchema = z.object({
    maintenanceEnabled: z.boolean().default(false),
    maintenanceMessage: trimmedLongText.default("Bakim calismasi var. Lutfen daha sonra tekrar deneyin."),
    motdEnabled: z.boolean().default(false),
    motdText: trimmedShortText.default(""),
});

const featureSettingsSchema = z.object({
    registrationsEnabled: z.boolean().default(true),
    guestGameplayEnabled: z.boolean().default(true),
    roomCreateEnabled: z.boolean().default(true),
    roomJoinEnabled: z.boolean().default(true),
    storeEnabled: z.boolean().default(true),
});

const economySettingsSchema = z.object({
    startingCoinBalance: z.number().int().min(0).max(1_000_000).default(0),
    winRewardCoin: z.number().int().min(0).max(1_000_000).default(120),
    lossRewardCoin: z.number().int().min(0).max(1_000_000).default(40),
    drawRewardCoin: z.number().int().min(0).max(1_000_000).default(40),
    matchCoinMultiplier: z.number().min(0).max(10).default(1),
    weekendCoinMultiplierEnabled: z.boolean().default(false),
    weekendCoinMultiplier: z.number().min(1).max(10).default(1.5),
    storePriceMultiplier: z.number().min(0.1).max(10).default(1),
    bundlesEnabled: z.boolean().default(true),
    discountCampaignsEnabled: z.boolean().default(true),
    couponsEnabled: z.boolean().default(true),
});

const captchaSettingsSchema = z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(CAPTCHA_PROVIDERS).default("none"),
    onRegister: z.boolean().default(true),
    onGuestJoin: z.boolean().default(false),
    onRoomCreate: z.boolean().default(true),
    onLogin: z.boolean().default(false),
    failMode: z.enum(CAPTCHA_FAIL_MODES).default("soft_fail"),
    recaptchaScoreThreshold: z.number().min(0).max(1).default(0.5),
    turnstileInteractiveFallback: z.boolean().default(true),
});

const securitySettingsSchema = z.object({
    captcha: captchaSettingsSchema.default(captchaSettingsSchema.parse({})),
});

export const systemSettingsSchema = z.object({
    platform: platformSettingsSchema.default(platformSettingsSchema.parse({})),
    features: featureSettingsSchema.default(featureSettingsSchema.parse({})),
    economy: economySettingsSchema.default(economySettingsSchema.parse({})),
    security: securitySettingsSchema.default(securitySettingsSchema.parse({})),
});

export const systemSettingsWriteSchema = z.object({
    platform: platformSettingsSchema,
    features: featureSettingsSchema,
    economy: economySettingsSchema,
    security: securitySettingsSchema,
});

export type SystemSettingsNamespace = keyof SystemSettings;

export const SYSTEM_SETTINGS_NAMESPACES = [
    "platform",
    "features",
    "economy",
    "security",
] as const satisfies readonly SystemSettingsNamespace[];

export const DEFAULT_SYSTEM_SETTINGS = systemSettingsSchema.parse({}) satisfies SystemSettings;

export function normalizeSystemSettings(input: unknown): SystemSettings {
    return systemSettingsSchema.parse(input);
}
