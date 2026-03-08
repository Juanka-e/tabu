import type { TemplateConfig, StoreItemRarity, StoreItemRenderMode } from "@/types/economy";

type CardFaceTexture = "none" | "grid" | "dots" | "diagonal";

export interface CardFaceThemeSource {
    renderMode: StoreItemRenderMode;
    imageUrl: string;
    templateKey: string | null;
    templateConfig: TemplateConfig | null;
    rarity: StoreItemRarity;
}

export interface ResolvedCardFaceTheme {
    accentColor: string;
    surfaceColor: string;
    borderColor: string;
    wordColor: string;
    tabooColor: string;
    footerColor: string;
    overlayImageUrl: string | null;
    overlayOpacity: number;
    texture: CardFaceTexture;
}

const safeHexColorPattern = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const supportedTextures = new Set<CardFaceTexture>(["none", "grid", "dots", "diagonal"]);

const rarityThemes: Record<StoreItemRarity, Omit<ResolvedCardFaceTheme, "overlayImageUrl" | "overlayOpacity">> = {
    common: {
        accentColor: "#64748b",
        surfaceColor: "#f8fafc",
        borderColor: "#cbd5e1",
        wordColor: "#ffffff",
        tabooColor: "#dc2626",
        footerColor: "#e2e8f0",
        texture: "none",
    },
    rare: {
        accentColor: "#2563eb",
        surfaceColor: "#0f172a",
        borderColor: "#60a5fa",
        wordColor: "#ffffff",
        tabooColor: "#f87171",
        footerColor: "#dbeafe",
        texture: "grid",
    },
    epic: {
        accentColor: "#7c3aed",
        surfaceColor: "#1e1b4b",
        borderColor: "#c084fc",
        wordColor: "#ffffff",
        tabooColor: "#fda4af",
        footerColor: "#ede9fe",
        texture: "dots",
    },
    legendary: {
        accentColor: "#ea580c",
        surfaceColor: "#431407",
        borderColor: "#fdba74",
        wordColor: "#fff7ed",
        tabooColor: "#fecaca",
        footerColor: "#ffedd5",
        texture: "diagonal",
    },
};

function getSafeColor(value: TemplateConfig[string] | undefined, fallback: string): string {
    return typeof value === "string" && safeHexColorPattern.test(value) ? value : fallback;
}

function getSafeTexture(value: TemplateConfig[string] | undefined, fallback: CardFaceTexture): CardFaceTexture {
    return typeof value === "string" && supportedTextures.has(value as CardFaceTexture)
        ? (value as CardFaceTexture)
        : fallback;
}

function getSafeOpacity(value: TemplateConfig[string] | undefined, fallback: number): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return fallback;
    }
    return Math.min(0.35, Math.max(0, value));
}

function applyTemplateKey(baseTheme: Omit<ResolvedCardFaceTheme, "overlayImageUrl" | "overlayOpacity">, templateKey: string | null) {
    switch (templateKey) {
        case "signal_grid":
            return {
                ...baseTheme,
                accentColor: "#0ea5e9",
                borderColor: "#67e8f9",
                texture: "grid" as const,
            };
        case "ember_glow":
            return {
                ...baseTheme,
                accentColor: "#f97316",
                borderColor: "#fdba74",
                surfaceColor: "#431407",
                texture: "diagonal" as const,
            };
        case "royal_velvet":
            return {
                ...baseTheme,
                accentColor: "#8b5cf6",
                borderColor: "#c4b5fd",
                surfaceColor: "#312e81",
                texture: "dots" as const,
            };
        default:
            return baseTheme;
    }
}

export function resolveCardFaceTheme(source: CardFaceThemeSource | null): ResolvedCardFaceTheme {
    const fallbackBase = rarityThemes.rare;

    if (!source) {
        return {
            ...fallbackBase,
            overlayImageUrl: null,
            overlayOpacity: 0,
        };
    }

    const rarityBase = rarityThemes[source.rarity];
    const keyedTheme = applyTemplateKey(rarityBase, source.templateKey);
    const config = source.templateConfig ?? {};

    return {
        accentColor: getSafeColor(config.accentColor, keyedTheme.accentColor),
        surfaceColor: getSafeColor(config.surfaceColor, keyedTheme.surfaceColor),
        borderColor: getSafeColor(config.borderColor, keyedTheme.borderColor),
        wordColor: getSafeColor(config.wordColor, keyedTheme.wordColor),
        tabooColor: getSafeColor(config.tabooColor, keyedTheme.tabooColor),
        footerColor: getSafeColor(config.footerColor, keyedTheme.footerColor),
        texture: getSafeTexture(config.texture, keyedTheme.texture),
        overlayImageUrl: source.renderMode === "image" && source.imageUrl ? source.imageUrl : null,
        overlayOpacity: source.renderMode === "image" ? 0.18 : getSafeOpacity(config.overlayOpacity, 0),
    };
}
