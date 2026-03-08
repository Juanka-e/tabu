"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
    User,
    Gamepad2,
    Shield,
    UserCog,
    Volume2,
    Music,
    ChevronRight,
    LogOut,
    Save,
} from "lucide-react";

export function SettingsContent() {
    const { data: session } = useSession();
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [soundOn, setSoundOn] = useState(true);
    const [musicOn, setMusicOn] = useState(false);
    const [language, setLanguage] = useState("tr");
    const [showOnline, setShowOnline] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!session?.user) return;
        setDisplayName(session.user.name || "");
        const load = async () => {
            try {
                const res = await fetch("/api/user/me", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.displayName) setDisplayName(data.displayName);
                    if (data.bio) setBio(data.bio);
                }
            } catch {
                // silently fail
            }
        };
        void load();
    }, [session]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/user/me", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ displayName, bio }),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch {
            // silently fail
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8 md:p-10 max-w-4xl mx-auto">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                        Manage your account and preferences.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left column */}
                <div className="space-y-6">
                    {/* Profile Settings */}
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
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
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
                                    onChange={(e) => setBio(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                />
                            </div>
                            <div className="pt-2 text-right">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2 rounded-lg shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                                >
                                    <Save size={14} />
                                    {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Privacy */}
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
                                    Allow friends to see when you are online
                                </div>
                            </div>
                            <ToggleSwitch
                                checked={showOnline}
                                onChange={setShowOnline}
                            />
                        </div>
                    </section>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                    {/* Game Settings */}
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
                                    checked={soundOn}
                                    onChange={setSoundOn}
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
                                    checked={musicOn}
                                    onChange={setMusicOn}
                                />
                            </div>
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                                    Language
                                </label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="tr">Türkçe</option>
                                    <option value="en">English (US)</option>
                                    <option value="es">Español</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Account */}
                    <section className="bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white/40 dark:border-slate-700/40 p-6 backdrop-blur-sm shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <UserCog size={20} className="text-red-500" />
                            Account
                        </h3>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
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

/* Toggle switch component */
function ToggleSwitch({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${checked ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-0.5"
                    }`}
            />
        </button>
    );
}
