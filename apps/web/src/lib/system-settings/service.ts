import { Prisma } from "@hushle/platform-db";
import { unlink } from "node:fs/promises";
import path from "node:path";
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

interface SystemSettingsCacheState {
    settings: SystemSettings | null;
    cachedAt: number;
    warnedAboutFallback: boolean;
}

type SystemSettingsGlobal = typeof globalThis & {
    __hushleSystemSettingsCacheState?: SystemSettingsCacheState;
};

function getSystemSettingsCacheState(): SystemSettingsCacheState {
    const globalState = globalThis as SystemSettingsGlobal;
    globalState.__hushleSystemSettingsCacheState ??= {
        settings: null,
        cachedAt: 0,
        warnedAboutFallback: false,
    };
    return globalState.__hushleSystemSettingsCacheState;
}

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
    const cache = getSystemSettingsCacheState();
    cache.settings = null;
    cache.cachedAt = 0;
}

function shouldUseCachedSettings(forceRefresh: boolean): boolean {
    const cache = getSystemSettingsCacheState();
    if (forceRefresh || !cache.settings) {
        return false;
    }

    return Date.now() - cache.cachedAt < SYSTEM_SETTINGS_CACHE_TTL_MS;
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
}

function getBrandingManagedAssetValues(settings: SystemSettings): string[] {
    return [
        settings.branding.logoUrl,
        settings.branding.faviconUrl,
        settings.branding.ogImageUrl,
    ]
        .map((value) => value.trim())
        .filter(Boolean);
}

function resolveManagedBrandingAssetPath(assetUrl: string): string | null {
    if (!assetUrl.startsWith("/branding/")) {
        return null;
    }

    const normalizedRelativePath = path.normalize(assetUrl.replace(/^\/+/, ""));
    const publicRoot = path.resolve(process.cwd(), "public");
    const assetPath = path.resolve(publicRoot, normalizedRelativePath);

    if (!assetPath.startsWith(publicRoot)) {
        return null;
    }

    return assetPath;
}

async function cleanupUnusedBrandingAssets(previous: SystemSettings, next: SystemSettings): Promise<void> {
    const nextActiveAssetUrls = new Set(getBrandingManagedAssetValues(next));
    const previousAssetUrls = new Set(getBrandingManagedAssetValues(previous));

    const staleAssetPaths = [...previousAssetUrls]
        .filter((assetUrl) => !nextActiveAssetUrls.has(assetUrl))
        .map(resolveManagedBrandingAssetPath)
        .filter((value): value is string => Boolean(value));

    await Promise.all(
        staleAssetPaths.map(async (staleAssetPath) => {
            try {
                await unlink(staleAssetPath);
            } catch {
                // Ignore missing or already-removed asset files.
            }
        })
    );
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

function shouldFallbackToDefaultSettings(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    return (
        error.message.includes("Can't reach database server") ||
        error.message.includes("Can't connect to database server") ||
        error.message.includes("Connection refused") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("the URL must start with the protocol `prisma://`") ||
        error.message.includes("the URL must start with the protocol `prisma+postgres://`")
    );
}

function logSystemSettingsFallback(error: Error): void {
    const cache = getSystemSettingsCacheState();
    if (cache.warnedAboutFallback) {
        return;
    }

    console.warn(
        "[system-settings] Falling back to default settings because the database is unavailable.",
        error.message
    );
    cache.warnedAboutFallback = true;
}

export async function getSystemSettings(options?: {
    forceRefresh?: boolean;
}): Promise<SystemSettings> {
    if (process.env.SKIP_DATABASE_DURING_BUILD === "true") {
        return normalizeSystemSettings(DEFAULT_SYSTEM_SETTINGS);
    }

    const forceRefresh = options?.forceRefresh ?? false;
    if (shouldUseCachedSettings(forceRefresh)) {
        return getSystemSettingsCacheState().settings as SystemSettings;
    }

    try {
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
        const cache = getSystemSettingsCacheState();
        cache.settings = settings;
        cache.cachedAt = Date.now();
        cache.warnedAboutFallback = false;

        return settings;
    } catch (error) {
        if (shouldFallbackToDefaultSettings(error)) {
            logSystemSettingsFallback(error as Error);
            const fallbackSettings = normalizeSystemSettings(DEFAULT_SYSTEM_SETTINGS);
            const cache = getSystemSettingsCacheState();
            cache.settings = fallbackSettings;
            cache.cachedAt = Date.now();
            return fallbackSettings;
        }

        throw error;
    }
}

export async function updateSystemSettings(
    nextSettings: SystemSettings,
    updatedByUserId: number
): Promise<SystemSettings> {
    const previousSettings = await getSystemSettings({ forceRefresh: true });
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

    const refreshedSettings = await getSystemSettings({ forceRefresh: true });
    await cleanupUnusedBrandingAssets(previousSettings, refreshedSettings);

    return refreshedSettings;
}

