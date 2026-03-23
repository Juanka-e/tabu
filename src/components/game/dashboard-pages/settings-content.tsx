"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
    ChevronRight,
    Gamepad2,
    LogOut,
    Music,
    Save,
    Shield,
    User,
    UserCog,
    Volume2,
} from "lucide-react";
import {
    defaultDashboardSettings,
    readDashboardSettings,
    type DashboardLanguage,
    type DashboardSettingsState,
    writeDashboardSettings,
} from "@/lib/dashboard-settings";
import type { UserInventoryResponse } from "@/types/economy";

export function SettingsContent() {
    const { data: session } = useSession();
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null);
    const [bio, setBio] = useState("");
    const [settings, setSettings] = useState<DashboardSettingsState>(defaultDashboardSettings);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!session?.user) {
            return;
        }

        setDisplayName(session.user.name || "");
        setSettings(readDashboardSettings());

        const load = async () => {
            try {
                const response = await fetch("/api/user/me", { cache: "no-store" });
                if (!response.ok) {
                    return;
                }

                const payload = (await response.json()) as UserInventoryResponse;
                setDisplayName(payload.profile.displayName || payload.name || session.user.name || "");
                setEmail(payload.email || "");
                setEmailVerifiedAt(payload.emailVerifiedAt);
                setBio(payload.profile.bio || "");
            } catch {
                // Keep local fallbacks.
            }
        };

        void load();
    }, [session]);

    useEffect(() => {
        writeDashboardSettings(settings);
    }, [settings]);

    const languageOptions = useMemo(
        () => [
            { value: "tr" as DashboardLanguage, label: "Turkce" },
            { value: "en" as DashboardLanguage, label: "English (US)" },
            { value: "es" as DashboardLanguage, label: "Espanol" },
        ],
        []
    );

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);

        try {
            const trimmedEmail = email.trim();
            const response = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    displayName,
                    email: trimmedEmail.length > 0 ? trimmedEmail : undefined,
                    bio,
                }),
            });

            if (response.ok) {
                setSaved(true);
                window.setTimeout(() => setSaved(false), 2000);
            }
        } catch {
            // Keep current inputs on failure.
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8 md:p-10 max-w-4xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                        Profile fields are live. Audio and gameplay options remain mock state for now.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <section className="bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white/40 dark:border-slate-700/40 p-6 backdrop-blur-sm shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <User size={20} className="text-blue-500" />
                            Profile Settings
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label
                                    className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5"
                                    htmlFor="displayName"
                                >
                                    Display Name
                                </label>
                                <input
                                    id="displayName"
                                    type="text"
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    maxLength={60}
                                />
                            </div>
                            <div>
                                <label
                                    className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5"
                                    htmlFor="email"
                                >
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    maxLength={191}
                                    autoComplete="email"
                                />
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {email
                                        ? emailVerifiedAt
                                            ? "E-posta dogrulandi."
                                            : "E-posta kayitli, dogrulama akisi daha sonra eklenecek."
                                        : "Bu hesapta henuz e-posta tanimli degil."}
                                </div>
                            </div>
                            <div>
                                <label
                                    className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5"
                                    htmlFor="bio"
                                >
                                    Bio
                                </label>
                                <textarea
                                    id="bio"
                                    rows={3}
                                    value={bio}
                                    onChange={(event) => setBio(event.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                    maxLength={300}
                                />
                            </div>
                            <div className="pt-2 text-right">
                                <button
                                    onClick={() => void handleSave()}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2 rounded-lg shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                                    type="button"
                                >
                                    <Save size={14} />
                                    {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white/40 dark:border-slate-700/40 p-6 backdrop-blur-sm shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <Shield size={20} className="text-purple-500" />
                            Privacy
                        </h3>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Show Online Status
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Mock preference stored locally until presence service is added.
                                </div>
                            </div>
                            <ToggleSwitch
                                checked={settings.showOnline}
                                onChange={(value) => setSettings((current) => ({ ...current, showOnline: value }))}
                            />
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white/40 dark:border-slate-700/40 p-6 backdrop-blur-sm shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <Gamepad2 size={20} className="text-orange-500" />
                            Game Settings
                        </h3>
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Volume2 size={18} className="text-slate-400" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Sound Effects
                                    </span>
                                </div>
                                <ToggleSwitch
                                    checked={settings.soundOn}
                                    onChange={(value) => setSettings((current) => ({ ...current, soundOn: value }))}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Music size={18} className="text-slate-400" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Background Music
                                    </span>
                                </div>
                                <ToggleSwitch
                                    checked={settings.musicOn}
                                    onChange={(value) => setSettings((current) => ({ ...current, musicOn: value }))}
                                />
                            </div>
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                                    Language
                                </label>
                                <select
                                    value={settings.language}
                                    onChange={(event) =>
                                        setSettings((current) => ({
                                            ...current,
                                            language: event.target.value as DashboardLanguage,
                                        }))
                                    }
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {languageOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white/40 dark:border-slate-700/40 p-6 backdrop-blur-sm shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <UserCog size={20} className="text-red-500" />
                            Account
                        </h3>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group" type="button">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Change Password
                                </span>
                                <ChevronRight
                                    size={18}
                                    className="text-slate-400 group-hover:text-blue-500"
                                />
                            </button>
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group text-red-600 dark:text-red-400"
                                type="button"
                            >
                                <span className="text-sm font-bold">Log Out</span>
                                <LogOut size={18} />
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function ToggleSwitch({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${checked ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
            type="button"
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-0.5"
                    }`}
            />
        </button>
    );
}
