"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCcw, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemSettingsResponse } from "@/types/system-settings";

const inputClassName = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-blue-500";
const helperClassName = "text-xs text-muted-foreground";

function FieldLabel({ label, helper }: { label: string; helper?: string }) {
    return (
        <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
            {helper ? <div className={helperClassName}>{helper}</div> : null}
        </div>
    );
}

function ToggleField({
    checked,
    label,
    description,
    onChange,
}: {
    checked: boolean;
    label: string;
    description: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm text-foreground">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span className="space-y-1">
                <span className="block font-semibold">{label}</span>
                <span className={helperClassName}>{description}</span>
            </span>
        </label>
    );
}

function ProviderBadge({ enabled, label }: { enabled: boolean; label: string }) {
    return (
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${enabled ? "bg-emerald-500/12 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
            {label}: {enabled ? "ready" : "missing"}
        </span>
    );
}

export default function SystemSettingsPage() {
    const [payload, setPayload] = useState<SystemSettingsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadSettings = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/admin/system-settings", { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Sistem ayarlari yuklenemedi.");
            }

            const nextPayload = (await response.json()) as SystemSettingsResponse;
            setPayload(nextPayload);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Sistem ayarlari yuklenemedi.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    const updatePayload = <TSection extends keyof SystemSettingsResponse["settings"], TKey extends keyof SystemSettingsResponse["settings"][TSection]>(
        section: TSection,
        key: TKey,
        value: SystemSettingsResponse["settings"][TSection][TKey]
    ) => {
        setPayload((currentPayload) => {
            if (!currentPayload) {
                return currentPayload;
            }

            return {
                ...currentPayload,
                settings: {
                    ...currentPayload.settings,
                    [section]: {
                        ...currentPayload.settings[section],
                        [key]: value,
                    },
                },
            };
        });
    };

    const updateCaptcha = <TKey extends keyof SystemSettingsResponse["settings"]["security"]["captcha"]>(
        key: TKey,
        value: SystemSettingsResponse["settings"]["security"]["captcha"][TKey]
    ) => {
        setPayload((currentPayload) => {
            if (!currentPayload) {
                return currentPayload;
            }

            return {
                ...currentPayload,
                settings: {
                    ...currentPayload.settings,
                    security: {
                        ...currentPayload.settings.security,
                        captcha: {
                            ...currentPayload.settings.security.captcha,
                            [key]: value,
                        },
                    },
                },
            };
        });
    };

    const handleSave = async () => {
        if (!payload) {
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch("/api/admin/system-settings", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload.settings),
            });

            const nextPayload = (await response.json()) as SystemSettingsResponse | { error?: string };
            if (!response.ok || !("settings" in nextPayload)) {
                throw new Error("error" in nextPayload && nextPayload.error ? nextPayload.error : "Sistem ayarlari kaydedilemedi.");
            }

            setPayload(nextPayload);
            setSuccess("Sistem ayarlari kaydedildi.");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Sistem ayarlari kaydedilemedi.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !payload) {
        return <div className="p-6 text-sm text-muted-foreground">Sistem ayarlari yukleniyor...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Sistem Ayarlari</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Canli platform davranisini runtime&apos;da yonet. Secret degerler burada degil, deploy env tarafinda kalir.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => void loadSettings()} disabled={loading || saving}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Yenile
                    </Button>
                    <Button onClick={() => void handleSave()} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Kaydediliyor" : "Kaydet"}
                    </Button>
                </div>
            </div>

            {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
            {success ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{success}</div> : null}

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><AlertTriangle className="h-5 w-5" />Platform Durumu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <ToggleField
                            checked={payload.settings.platform.maintenanceEnabled}
                            label="Bakim Modu"
                            description="Aktifse yeni create/join, kayit ve magazaya erisim kapatilir. Admin erisimi devam eder."
                            onChange={(checked) => updatePayload("platform", "maintenanceEnabled", checked)}
                        />
                        <ToggleField
                            checked={payload.settings.platform.motdEnabled}
                            label="MOTD Banner"
                            description="Tum oyunculara ust bantta operasyonel mesaj gosterir."
                            onChange={(checked) => updatePayload("platform", "motdEnabled", checked)}
                        />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel label="Bakim Mesaji" helper="Bakim modu aktif oldugunda kullaniciya donulecek ana mesaj." />
                        <textarea
                            className={`${inputClassName} min-h-24 resize-y`}
                            value={payload.settings.platform.maintenanceMessage}
                            onChange={(event) => updatePayload("platform", "maintenanceMessage", event.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel label="MOTD" helper="Dashboard ve giris yuzeyinde gosterilecek kisa canli mesaj." />
                        <textarea
                            className={`${inputClassName} min-h-20 resize-y`}
                            value={payload.settings.platform.motdText}
                            onChange={(event) => updatePayload("platform", "motdText", event.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><SlidersHorizontal className="h-5 w-5" />Feature Gate&apos;ler</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <ToggleField checked={payload.settings.features.registrationsEnabled} label="Kayitlar Acik" description="Register endpoint&apos;ini acik veya kapali tutar." onChange={(checked) => updatePayload("features", "registrationsEnabled", checked)} />
                    <ToggleField checked={payload.settings.features.guestGameplayEnabled} label="Misafir Girisi" description="Guest create/join akisini kontrol eder." onChange={(checked) => updatePayload("features", "guestGameplayEnabled", checked)} />
                    <ToggleField checked={payload.settings.features.roomCreateEnabled} label="Oda Olusturma" description="Yeni lobi acma iznini kontrol eder." onChange={(checked) => updatePayload("features", "roomCreateEnabled", checked)} />
                    <ToggleField checked={payload.settings.features.roomJoinEnabled} label="Odaya Katilim" description="Mevcut odalara yeni oyuncu katilimini kontrol eder." onChange={(checked) => updatePayload("features", "roomJoinEnabled", checked)} />
                    <ToggleField checked={payload.settings.features.storeEnabled} label="Magaza Acik" description="Store catalog, purchase, bundle ve equip akisini kontrol eder." onChange={(checked) => updatePayload("features", "storeEnabled", checked)} />
                </CardContent>
            </Card>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle className="text-xl">Ekonomi Temeli</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                        <FieldLabel label="Baslangic Coin" helper="Yeni kayit olan kullanicinin wallet bakiyesi." />
                        <input className={inputClassName} type="number" min="0" value={payload.settings.economy.startingCoinBalance} onChange={(event) => updatePayload("economy", "startingCoinBalance", Number(event.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel label="Galibiyet Odulu" helper="Mac kazanana verilecek coin." />
                        <input className={inputClassName} type="number" min="0" value={payload.settings.economy.winRewardCoin} onChange={(event) => updatePayload("economy", "winRewardCoin", Number(event.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel label="Maglubiyet Odulu" helper="Kaybeden oyuncuya verilecek coin." />
                        <input className={inputClassName} type="number" min="0" value={payload.settings.economy.lossRewardCoin} onChange={(event) => updatePayload("economy", "lossRewardCoin", Number(event.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel label="Beraberlik Odulu" helper="Mac berabere biterse verilecek coin." />
                        <input className={inputClassName} type="number" min="0" value={payload.settings.economy.drawRewardCoin} onChange={(event) => updatePayload("economy", "drawRewardCoin", Number(event.target.value))} />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5" />Captcha Hazirligi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <ProviderBadge enabled={payload.captchaReadiness.turnstileConfigured} label="Turnstile" />
                        <ProviderBadge enabled={payload.captchaReadiness.recaptchaConfigured} label="reCAPTCHA" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <ToggleField checked={payload.settings.security.captcha.enabled} label="Captcha Aktif" description="Provider enforcement sonraki fazda baglanacak. Burada operasyonel hazirlik tutulur." onChange={(checked) => updateCaptcha("enabled", checked)} />
                        <ToggleField checked={payload.settings.security.captcha.onRegister} label="Register'da Kullan" description="Kayit akisinda captcha zorunlulugu." onChange={(checked) => updateCaptcha("onRegister", checked)} />
                        <ToggleField checked={payload.settings.security.captcha.onRoomCreate} label="Oda Olusturmada Kullan" description="Abuse dalgasinda create akisina uygulanir." onChange={(checked) => updateCaptcha("onRoomCreate", checked)} />
                        <ToggleField checked={payload.settings.security.captcha.onGuestJoin} label="Guest Join'de Kullan" description="Misafir katilim akisinda acar/kapatir." onChange={(checked) => updateCaptcha("onGuestJoin", checked)} />
                        <ToggleField checked={payload.settings.security.captcha.onLogin} label="Login'de Kullan" description="Supheli giris dalgasinda sonradan devreye alinabilir." onChange={(checked) => updateCaptcha("onLogin", checked)} />
                        <ToggleField checked={payload.settings.security.captcha.turnstileInteractiveFallback} label="Interactive Fallback" description="Skor supheli ise interaktif challenge fallback kullanir." onChange={(checked) => updateCaptcha("turnstileInteractiveFallback", checked)} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <FieldLabel label="Provider" helper="Ayni anda tek provider aktif tutulur." />
                            <select className={inputClassName} value={payload.settings.security.captcha.provider} onChange={(event) => updateCaptcha("provider", event.target.value as SystemSettingsResponse["settings"]["security"]["captcha"]["provider"])}>
                                <option value="none">none</option>
                                <option value="turnstile">turnstile</option>
                                <option value="recaptcha_v3">recaptcha_v3</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Fail Mode" helper="Provider erisilemezse nasil davranilacagini belirler." />
                            <select className={inputClassName} value={payload.settings.security.captcha.failMode} onChange={(event) => updateCaptcha("failMode", event.target.value as SystemSettingsResponse["settings"]["security"]["captcha"]["failMode"])}>
                                <option value="soft_fail">soft_fail</option>
                                <option value="hard_fail">hard_fail</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="reCAPTCHA Score" helper="0 ile 1 arasinda skor esigi." />
                            <input className={inputClassName} type="number" min="0" max="1" step="0.05" value={payload.settings.security.captcha.recaptchaScoreThreshold} onChange={(event) => updateCaptcha("recaptchaScoreThreshold", Number(event.target.value))} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


