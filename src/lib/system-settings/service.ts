import { Prisma } from "@prisma/client";
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

function getBrandingManagedAssetValues(settings: SystemSettings): string[] {
    return [
        settings.branding.logoUrl,
        settings.branding.brandIconUrl,
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

