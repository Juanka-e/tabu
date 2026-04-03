"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronRight,
  Gamepad2,
  LogOut,
  Music,
  Save,
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
  const [saveError, setSaveError] = useState("");

  const username = session?.user?.name || "";

  useEffect(() => {
    writeDashboardSettings(settings);
  }, [settings]);

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
        const resolvedDisplayName =
          payload.profile.displayName || payload.name || session.user.name || "";
        setDisplayName(resolvedDisplayName);
        localStorage.setItem("tabu_username", resolvedDisplayName);
        setEmail(payload.email || "");
        setEmailVerifiedAt(payload.emailVerifiedAt);
        setBio(payload.profile.bio || "");
      } catch {
        // Keep local fallbacks.
      }
    };

    void load();
  }, [session]);

  const languageOptions = useMemo(
    () => [
      { value: "tr" as DashboardLanguage, label: "Türkçe" },
      { value: "en" as DashboardLanguage, label: "English (US)" },
      { value: "es" as DashboardLanguage, label: "Español" },
    ],
    []
  );

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError("");

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

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setSaveError(payload?.error || "Profil güncellenemedi.");
        return;
      }

      const payload = (await response.json()) as {
        profile?: { displayName?: string | null };
      };
      const nextDisplayName =
        payload.profile?.displayName?.trim() || session?.user?.name || displayName.trim();
      localStorage.setItem("tabu_username", nextDisplayName);
      setDisplayName(nextDisplayName);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Profil güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardPageShell
      eyebrow="Tercihler"
      title="Ayarlar"
      description="Profil alanları hesapta saklanır. Ses ve oynanış tercihleri şimdilik bu cihazda tutuluyor."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <DashboardSection
            title="Profil Ayarları"
            description="Hesap adı ile oyunda görünen adı ayrı tutuyoruz."
            action={<User size={18} className="text-blue-500" />}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Kullanıcı Adı
                </div>
                <div className="text-sm font-black text-slate-800 dark:text-slate-100">@{username}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Giriş yaparken kullandığın hesap adı. Sabit kalır.
                </div>
              </div>

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
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Lobide ve oyunda diğer oyuncuların gördüğü ad. İstediğin zaman değiştirebilirsin.
                </div>
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
                      ? "E-posta doğrulandı."
                      : "E-posta kayıtlı, doğrulama akışı daha sonra eklenecek."
                    : "Bu hesapta henüz e-posta tanımlı değil."}
                </div>
              </div>

              <div>
                <label
                  className="mb-1.5 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400"
                  htmlFor="bio"
                >
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

              {saveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                  {saveError}
                </div>
              ) : null}

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
