import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
    DEFAULT_SYSTEM_SETTINGS,
    normalizeSystemSettings,
    SYSTEM_SETTINGS_NAMESPACES,
} from "@/lib/system-settings/schema";
import type {
    CaptchaProviderReadiness,
    SystemSettings,
} from "@/types/system-settings";

const SYSTEM_SETTINGS_CACHE_TTL_MS = 15_000;

let cachedSystemSettings: SystemSettings | null = null;
let cachedAt = 0;

function isCaptchaProviderConfigured(siteKey: string | undefined, secretKey: string | undefined): boolean {
    return Boolean(siteKey && siteKey.trim() && secretKey && secretKey.trim());
}

export function getCaptchaProviderReadiness(): CaptchaProviderReadiness {
    return {
        turnstileConfigured: isCaptchaProviderConfigured(
            process.env.TURNSTILE_SITE_KEY,
            process.env.TURNSTILE_SECRET_KEY
        ),
        recaptchaConfigured: isCaptchaProviderConfigured(
            process.env.RECAPTCHA_SITE_KEY,
            process.env.RECAPTCHA_SECRET_KEY
        ),
    };
}

export function clearSystemSettingsCache(): void {
    cachedSystemSettings = null;
    cachedAt = 0;
}

function shouldUseCachedSettings(forceRefresh: boolean): boolean {
    if (forceRefresh || !cachedSystemSettings) {
        return false;
    }

    return Date.now() - cachedAt < SYSTEM_SETTINGS_CACHE_TTL_MS;
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
}

function buildSettingsFromRows(
    rows: Array<{ key: string; value: unknown }>
): SystemSettings {
    const rawSettings: Partial<Record<keyof SystemSettings, unknown>> = {};

    for (const row of rows) {
        if (SYSTEM_SETTINGS_NAMESPACES.includes(row.key as keyof SystemSettings)) {
            rawSettings[row.key as keyof SystemSettings] = row.value;
        }
    }

    return normalizeSystemSettings({
        ...DEFAULT_SYSTEM_SETTINGS,
        ...rawSettings,
    });
}

export async function getSystemSettings(options?: {
    forceRefresh?: boolean;
}): Promise<SystemSettings> {
    const forceRefresh = options?.forceRefresh ?? false;
    if (shouldUseCachedSettings(forceRefresh)) {
        return cachedSystemSettings as SystemSettings;
    }

    const rows = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [...SYSTEM_SETTINGS_NAMESPACES],
            },
        },
        select: {
            key: true,
            value: true,
        },
    });

    const settings = buildSettingsFromRows(rows);
    cachedSystemSettings = settings;
    cachedAt = Date.now();

    return settings;
}

export async function updateSystemSettings(
    nextSettings: SystemSettings,
    updatedByUserId: number
): Promise<SystemSettings> {
    const normalizedSettings = normalizeSystemSettings(nextSettings);

    await prisma.$transaction(
        SYSTEM_SETTINGS_NAMESPACES.map((namespace) =>
            prisma.systemSetting.upsert({
                where: { key: namespace },
                update: {
                    value: toInputJsonValue(normalizedSettings[namespace]),
                    updatedByUserId,
                },
                create: {
                    key: namespace,
                    value: toInputJsonValue(normalizedSettings[namespace]),
                    updatedByUserId,
                },
            })
        )
    );

    clearSystemSettingsCache();

    return getSystemSettings({ forceRefresh: true });
}

