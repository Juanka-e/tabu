import type { TemplateConfig, StoreItemRarity, StoreItemRenderMode } from "@/types/economy";

type CardBackTexture = "none" | "grid" | "dots" | "diagonal";

export interface CardBackThemeSource {
    renderMode: StoreItemRenderMode;
    imageUrl: string;
    templateKey: string | null;
    templateConfig: TemplateConfig | null;
    rarity: StoreItemRarity;
}

export interface ResolvedCardBackTheme {
    surfaceColor: string;
    borderColor: string;
    accentColor: string;
    titleColor: string;
    detailColor: string;
    texture: CardBackTexture;
    overlayImageUrl: string | null;
    overlayOpacity: number;
}

const safeHexColorPattern = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const supportedTextures = new Set<CardBackTexture>(["none", "grid", "dots", "diagonal"]);

const rarityThemes: Record<StoreItemRarity, Omit<ResolvedCardBackTheme, "overlayImageUrl" | "overlayOpacity">> = {
    common: {
        surfaceColor: "#0f172a",
        borderColor: "#475569",
        accentColor: "#94a3b8",
        titleColor: "#f8fafc",
        detailColor: "#cbd5e1",
        texture: "none",
    },
    rare: {
        surfaceColor: "#082f49",
        borderColor: "#38bdf8",
        accentColor: "#7dd3fc",
        titleColor: "#e0f2fe",
        detailColor: "#bae6fd",
        texture: "grid",
    },
    epic: {
        surfaceColor: "#2e1065",
        borderColor: "#a855f7",
        accentColor: "#c084fc",
        titleColor: "#f5f3ff",
        detailColor: "#ddd6fe",
        texture: "dots",
    },
    legendary: {
        surfaceColor: "#431407",
        borderColor: "#f97316",
        accentColor: "#fdba74",
        titleColor: "#fff7ed",
        detailColor: "#fed7aa",
        texture: "diagonal",
    },
};

function getSafeColor(value: TemplateConfig[string] | undefined, fallback: string): string {
    return typeof value === "string" && safeHexColorPattern.test(value) ? value : fallback;
}

function getSafeTexture(value: TemplateConfig[string] | undefined, fallback: CardBackTexture): CardBackTexture {
    return typeof value === "string" && supportedTextures.has(value as CardBackTexture)
        ? (value as CardBackTexture)
        : fallback;
}

function getSafeOpacity(value: TemplateConfig[string] | undefined, fallback: number): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return fallback;
    }

    return Math.min(0.45, Math.max(0, value));
}

function applyTemplateKey(
    baseTheme: Omit<ResolvedCardBackTheme, "overlayImageUrl" | "overlayOpacity">,
    templateKey: string | null
): Omit<ResolvedCardBackTheme, "overlayImageUrl" | "overlayOpacity"> {
    switch (templateKey) {
        case "midnight_mesh":
            return {
                ...baseTheme,
                surfaceColor: "#111827",
                borderColor: "#60a5fa",
                accentColor: "#22d3ee",
                texture: "grid",
            };
        case "royal_seal":
            return {
                ...baseTheme,
                surfaceColor: "#312e81",
                borderColor: "#c4b5fd",
                accentColor: "#f59e0b",
                texture: "dots",
            };
        case "ember_vault":
            return {
                ...baseTheme,
                surfaceColor: "#3f1d0f",
                borderColor: "#fb923c",
                accentColor: "#fdba74",
                texture: "diagonal",
            };
        default:
            return baseTheme;
    }
}

export function resolveCardBackTheme(source: CardBackThemeSource | null): ResolvedCardBackTheme {
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
        surfaceColor: getSafeColor(config.surfaceColor, keyedTheme.surfaceColor),
        borderColor: getSafeColor(config.borderColor, keyedTheme.borderColor),
        accentColor: getSafeColor(config.accentColor, keyedTheme.accentColor),
        titleColor: getSafeColor(config.titleColor, keyedTheme.titleColor),
        detailColor: getSafeColor(config.detailColor, keyedTheme.detailColor),
        texture: getSafeTexture(config.texture, keyedTheme.texture),
        overlayImageUrl: source.renderMode === "image" && source.imageUrl ? source.imageUrl : null,
        overlayOpacity: source.renderMode === "image" ? 0.24 : getSafeOpacity(config.overlayOpacity, 0),
    };
}
