import type { Metadata, Viewport } from "next";
import type { BrandingSettings } from "@/types/system-settings";

function resolveSiteUrl(): URL | undefined {
    const rawUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        "http://localhost:3000";

    try {
        return new URL(rawUrl);
    } catch {
        return undefined;
    }
}

function normalizeTwitterHandle(handle: string): string | undefined {
    const trimmed = handle.trim();
    if (!trimmed) {
        return undefined;
    }

    return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function resolveAssetUrl(value: string, metadataBase?: URL): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }

    if (trimmed.startsWith("/") && metadataBase) {
        return new URL(trimmed, metadataBase).toString();
    }

    return trimmed;
}

export function buildRootMetadata(branding: BrandingSettings): Metadata {
    const metadataBase = resolveSiteUrl();
    const ogImage = resolveAssetUrl(branding.ogImageUrl, metadataBase);
    const favicon = resolveAssetUrl(branding.faviconUrl, metadataBase) ?? "/favicon.ico";
    const twitterHandle = normalizeTwitterHandle(branding.twitterHandle);

    return {
        metadataBase,
        applicationName: branding.siteShortName,
        title: {
            default: branding.defaultTitle,
            template: branding.titleTemplate,
        },
        description: branding.defaultDescription,
        openGraph: {
            title: branding.defaultTitle,
            description: branding.defaultDescription,
            type: "website",
            locale: "tr_TR",
            siteName: branding.siteName,
            images: ogImage ? [{ url: ogImage }] : undefined,
        },
        twitter: {
            card: ogImage ? "summary_large_image" : "summary",
            title: branding.defaultTitle,
            description: branding.defaultDescription,
            creator: twitterHandle,
            images: ogImage ? [ogImage] : undefined,
        },
        icons: {
            icon: favicon,
            shortcut: favicon,
            apple: favicon,
        },
    };
}

export function buildRootViewport(branding: BrandingSettings): Viewport {
    return {
        themeColor: branding.themeColor,
    };
}

export function buildRoomMetadata(branding: BrandingSettings): Metadata {
    const metadataBase = resolveSiteUrl();
    const ogImage = resolveAssetUrl(branding.ogImageUrl, metadataBase);
    const roomTitle = `Oyun Odasi | ${branding.siteName}`;
    const roomDescription = `Online ${branding.siteName} odasi. Takiminla birlikte yasakli kelimelere dikkat ederek anlatmaya calis.`;

    return {
        title: roomTitle,
        description: roomDescription,
        openGraph: {
            title: branding.defaultTitle,
            description: branding.defaultDescription,
            type: "website",
            siteName: branding.siteName,
            images: ogImage ? [{ url: ogImage }] : undefined,
        },
        twitter: {
            card: ogImage ? "summary_large_image" : "summary",
            title: branding.defaultTitle,
            description: branding.defaultDescription,
            images: ogImage ? [ogImage] : undefined,
        },
    };
}
