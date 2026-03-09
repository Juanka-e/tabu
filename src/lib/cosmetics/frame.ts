import type { TemplateConfig, StoreItemRarity, StoreItemRenderMode } from "@/types/economy";

export interface FrameThemeSource {
    renderMode: StoreItemRenderMode;
    imageUrl: string;
    templateKey: string | null;
    templateConfig: TemplateConfig | null;
    rarity: StoreItemRarity;
}

export interface ResolvedFrameTheme {
    accentColor: string;
    imageUrl: string | null;
}

const safeHexColorPattern = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const rarityAccent: Record<StoreItemRarity, string> = {
    common: "#94a3b8",
    rare: "#38bdf8",
    epic: "#a855f7",
    legendary: "#f59e0b",
};

function getSafeColor(value: TemplateConfig[string] | undefined, fallback: string): string {
    return typeof value === "string" && safeHexColorPattern.test(value) ? value : fallback;
}

function applyTemplateKey(rarityColor: string, templateKey: string | null): string {
    switch (templateKey) {
        case "royal_ring":
            return "#8b5cf6";
        case "glacier_edge":
            return "#0ea5e9";
        case "ember_edge":
            return "#f97316";
        default:
            return rarityColor;
    }
}

export function resolveFrameTheme(source: FrameThemeSource | null): ResolvedFrameTheme | null {
    if (!source) {
        return null;
    }

    const rarityColor = rarityAccent[source.rarity];
    const templateColor = applyTemplateKey(rarityColor, source.templateKey);
    const config = source.templateConfig ?? {};

    return {
        accentColor: getSafeColor(config.accentColor, templateColor),
        imageUrl: source.renderMode === "image" && source.imageUrl ? source.imageUrl : null,
    };
}
