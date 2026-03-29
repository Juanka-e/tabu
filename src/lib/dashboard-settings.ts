export type DashboardLanguage = "tr" | "en" | "es";

export interface DashboardSettingsState {
    soundOn: boolean;
    musicOn: boolean;
    language: DashboardLanguage;
    showOnline: boolean;
}

const DASHBOARD_SETTINGS_STORAGE_KEY = "tabu_dashboard_settings_v1";

export const defaultDashboardSettings: DashboardSettingsState = {
    soundOn: true,
    musicOn: false,
    language: "tr",
    showOnline: true,
};

export function readDashboardSettings(): DashboardSettingsState {
    if (typeof window === "undefined") {
        return defaultDashboardSettings;
    }

    const raw = window.localStorage.getItem(DASHBOARD_SETTINGS_STORAGE_KEY);
    if (!raw) {
        return defaultDashboardSettings;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<DashboardSettingsState>;
        return {
            soundOn: typeof parsed.soundOn === "boolean" ? parsed.soundOn : defaultDashboardSettings.soundOn,
            musicOn: typeof parsed.musicOn === "boolean" ? parsed.musicOn : defaultDashboardSettings.musicOn,
            language: parsed.language === "en" || parsed.language === "es" || parsed.language === "tr"
                ? parsed.language
                : defaultDashboardSettings.language,
            showOnline: typeof parsed.showOnline === "boolean" ? parsed.showOnline : defaultDashboardSettings.showOnline,
        };
    } catch {
        return defaultDashboardSettings;
    }
}

export function writeDashboardSettings(settings: DashboardSettingsState): void {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(DASHBOARD_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
