export interface CardFlipSettingsState {
    enabled: boolean;
}

export const defaultCardFlipSettings: CardFlipSettingsState = {
    enabled: false,
};

const CARD_FLIP_SETTINGS_STORAGE_KEY = "hushle_card_flip_settings_v1";

export function parseCardFlipSettings(raw: string | null): CardFlipSettingsState {
    if (!raw) {
        return defaultCardFlipSettings;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<CardFlipSettingsState>;
        return {
            enabled:
                typeof parsed.enabled === "boolean"
                    ? parsed.enabled
                    : defaultCardFlipSettings.enabled,
        };
    } catch {
        return defaultCardFlipSettings;
    }
}

export function readCardFlipSettings(): CardFlipSettingsState {
    if (typeof window === "undefined") {
        return defaultCardFlipSettings;
    }

    return parseCardFlipSettings(
        window.localStorage.getItem(CARD_FLIP_SETTINGS_STORAGE_KEY)
    );
}

export function writeCardFlipSettings(
    settings: CardFlipSettingsState
): void {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(
        CARD_FLIP_SETTINGS_STORAGE_KEY,
        JSON.stringify(settings)
    );
}
