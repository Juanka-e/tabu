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
import { DashboardPageShell, DashboardSection } from "@/components/game/dashboard-page-shell";
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
    <DashboardPageShell
      eyebrow="Tercihler"
      title="Ayarlar"
      description="Profil alanları kalıcıdır. Ses ve oynanış tercihleri şu an yerel geçici ayar olarak tutuluyor."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <DashboardSection
            title="Profil Ayarları"
            description="Hesapta kalıcı olarak saklanan kimlik alanları."
            action={<User size={18} className="text-blue-500" />}
          >
            <div className="space-y-4">
              <div>
                <label
                  className="mb-1.5 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400"
                  htmlFor="displayName"
                >
                  Görünen Ad
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  maxLength={60}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400" htmlFor="bio">
                  Biyografi
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  maxLength={300}
                />
              </div>
              <div className="pt-2 text-right">
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 disabled:opacity-50"
                  type="button"
                >
                  <Save size={14} />
                  {saved ? "Kaydedildi" : saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Gizlilik"
            description="Presence servisi eklenene kadar geçici yerel tercihler."
            action={<Shield size={18} className="text-purple-500" />}
          >
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Çevrimiçi Durumu Göster
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Presence servisi eklenene kadar bu tercih sadece bu cihazda tutulur.
                </div>
              </div>
              <ToggleSwitch
                checked={settings.showOnline}
                onChange={(value) => setSettings((current) => ({ ...current, showOnline: value }))}
              />
            </div>
          </DashboardSection>
        </div>

        <div className="space-y-6">
          <DashboardSection
            title="Oyun Ayarları"
            description="Konfor, ses ve dil tercihleri için istemci taraflı kontroller."
            action={<Gamepad2 size={18} className="text-orange-500" />}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 size={18} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Ses Efektleri
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
                    Arka Plan Müziği
                  </span>
                </div>
                <ToggleSwitch
                  checked={settings.musicOn}
                  onChange={(value) => setSettings((current) => ({ ...current, musicOn: value }))}
                />
              </div>
              <div className="pt-2">
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                  Dil
                </label>
                <select
                  value={settings.language}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      language: event.target.value as DashboardLanguage,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Hesap"
            description="Hesap seviyesi işlemler ve giriş kontrolleri."
            action={<UserCog size={18} className="text-red-500" />}
          >
            <div className="space-y-3">
              <button
                className="group flex w-full items-center justify-between rounded-xl p-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                type="button"
              >
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Şifre Değiştir
                </span>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-500" />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="group flex w-full items-center justify-between rounded-xl p-3 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                type="button"
              >
                <span className="text-sm font-bold">Çıkış Yap</span>
                <LogOut size={18} />
              </button>
            </div>
          </DashboardSection>
        </div>
      </div>
    </DashboardPageShell>
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
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
        checked ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
      type="button"
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
