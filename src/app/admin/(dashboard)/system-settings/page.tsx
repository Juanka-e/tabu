"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertTriangle,
    Coins,
    Paintbrush2,
    RefreshCcw,
    Save,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAutomaticBrandingPreviewUrl } from "@/lib/branding/assets";
import type { SystemSettingsResponse } from "@/types/system-settings";

const inputClassName = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-blue-500";
const helperClassName = "text-xs text-muted-foreground";
const brandingGuide = [
    "Open Graph gorseli, link paylasildiginda gorulen buyuk kart gorselidir.",
    "Tavsiye edilen olcu: 1200x630 px.",
    "Desteklenecek hedef formatlar: PNG, JPG/JPEG, WEBP.",
    "Mutlaka okunur tipografi ve guclu kontrast kullan.",
];
const sections = [
    {
        key: "platform",
        label: "Platform",
        description: "Bakim, feature gate ve operasyon davranislari.",
        icon: SlidersHorizontal,
    },
    {
        key: "branding",
        label: "Branding & SEO",
        description: "Title, OG, favicon, canonical ve arama motoru sinyalleri.",
        icon: Paintbrush2,
    },
    {
        key: "economy",
        label: "Ekonomi",
        description: "Coin, odul ve magaza carpani davranislari.",
        icon: Coins,
    },
    {
        key: "security",
        label: "Guvenlik",
        description: "Captcha policy ve provider hazirligi.",
        icon: ShieldCheck,
    },
] as const;

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
    const isProductionBuild = process.env.NODE_ENV === "production";
    const [payload, setPayload] = useState<SystemSettingsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [activeSection, setActiveSection] = useState<"platform" | "branding" | "economy" | "security">("branding");

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

    const ogImageUrl = payload.settings.branding.ogImageUrl.trim();
    const canAutoPreviewOgImage = isAutomaticBrandingPreviewUrl(ogImageUrl);

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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.key;

                    return (
                        <button
                            key={section.key}
                            type="button"
                            onClick={() => setActiveSection(section.key)}
                            className={`rounded-2xl border px-4 py-4 text-left transition ${
                                isActive
                                    ? "border-blue-500/40 bg-blue-500/10 shadow-[0_12px_40px_-24px_rgba(59,130,246,0.7)]"
                                    : "border-border/70 bg-background hover:border-blue-500/30 hover:bg-muted/30"
                            }`}
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Icon className="h-4 w-4" />
                                {section.label}
                            </div>
                            <div className="mt-2 text-xs leading-5 text-muted-foreground">{section.description}</div>
                        </button>
                    );
                })}
            </div>

            {activeSection === "platform" ? (
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
            ) : null}

            {activeSection === "branding" ? (
            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle className="text-xl">Branding ve SEO</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                            <FieldLabel label="Site Adi" helper="Open Graph, title template ve genel marka adi." />
                            <input
                                className={inputClassName}
                                value={payload.settings.branding.siteName}
                                onChange={(event) => updatePayload("branding", "siteName", event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Kisa Ad" helper="Uygulama adi ve kisaltilmis marka etiketi." />
                            <input
                                className={inputClassName}
                                value={payload.settings.branding.siteShortName}
                                onChange={(event) => updatePayload("branding", "siteShortName", event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Theme Color" helper="Tarayici ve platform meta theme color degeri." />
                            <input
                                className={inputClassName}
                                value={payload.settings.branding.themeColor}
                                onChange={(event) => updatePayload("branding", "themeColor", event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Twitter Handle" helper="Opsiyonel. @ olmadan da girilebilir." />
                            <input
                                className={inputClassName}
                                value={payload.settings.branding.twitterHandle}
                                onChange={(event) => updatePayload("branding", "twitterHandle", event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <FieldLabel label="Varsayilan Title" helper="Ana sayfa ve share kartlari icin ana baslik." />
                            <input
                                className={inputClassName}
                                value={payload.settings.branding.defaultTitle}
                                onChange={(event) => updatePayload("branding", "defaultTitle", event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Title Template" helper="Sayfa bazli title varsa `%s` yerine gelir." />
                            <input
                                className={inputClassName}
                                value={payload.settings.branding.titleTemplate}
                                onChange={(event) => updatePayload("branding", "titleTemplate", event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <FieldLabel label="Varsayilan Description" helper="SEO description, Open Graph ve Twitter kartlarinda kullanilir." />
                        <textarea
                            className={`${inputClassName} min-h-24 resize-y`}
                            value={payload.settings.branding.defaultDescription}
                            onChange={(event) => updatePayload("branding", "defaultDescription", event.target.value)}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <FieldLabel label="Open Graph Gorseli" helper="Bos birakirsan varsayilan text-only share metadata calisir." />
                            <input
                                className={inputClassName}
                                placeholder="https://... veya /og-cover.png"
                                value={payload.settings.branding.ogImageUrl}
                                onChange={(event) => updatePayload("branding", "ogImageUrl", event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Favicon Yolu" helper="Varsayilan fallback `/favicon.ico` olarak kalir." />
                            <input
                                className={inputClassName}
                                placeholder="/favicon.ico"
                                value={payload.settings.branding.faviconUrl}
                                onChange={(event) => updatePayload("branding", "faviconUrl", event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
                        <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                            <div className="flex flex-wrap items-center gap-3">
                                <div
                                    className="h-11 w-11 rounded-2xl border border-border/70 bg-background"
                                    style={{ backgroundColor: payload.settings.branding.themeColor }}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-foreground">
                                        {payload.settings.branding.siteName}
                                    </div>
                                    <div className="mt-1 truncate text-xs text-muted-foreground">
                                        {payload.settings.branding.faviconUrl || "/favicon.ico"}
                                    </div>
                                </div>
                                <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    Theme {payload.settings.branding.themeColor}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-background p-4">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    Tarayici sekmesi / title
                                </div>
                                <div className="mt-3 truncate text-base font-semibold text-foreground">
                                    {payload.settings.branding.defaultTitle}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    Template: {payload.settings.branding.titleTemplate}
                                </div>
                                <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                    {payload.settings.branding.defaultDescription}
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-border/70 bg-background p-3 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.6)]">
                                <div className="rounded-[22px] border border-border/70 bg-muted/20 p-3">
                                    {ogImageUrl && canAutoPreviewOgImage ? (
                                        // External preview URLs are operator-controlled and may not be in Next image remotePatterns.
                                        // Only root-relative app assets are previewed automatically.
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={ogImageUrl}
                                            alt="Open Graph preview"
                                            className="aspect-[1200/630] w-full rounded-2xl object-cover"
                                        />
                                    ) : ogImageUrl ? (
                                        <div className="space-y-3 rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4 text-left text-xs text-muted-foreground">
                                            <div className="font-semibold uppercase tracking-[0.16em] text-foreground">
                                                Otomatik preview kapali
                                            </div>
                                            <div>
                                                Dis URL gorselleri admin tarayicisindan otomatik yuklenmez. Upload slice gelene kadar sadece root-relative app asset&apos;leri burada otomatik preview edilir.
                                            </div>
                                            <a
                                                href={ogImageUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex rounded-full border border-border/70 bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground transition hover:border-blue-500/40 hover:text-blue-600"
                                            >
                                                Gorseli yeni sekmede ac
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="flex aspect-[1200/630] w-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/40 text-center text-xs text-muted-foreground">
                                            OG gorseli girildiginde burada onizleme gorunur.
                                        </div>
                                    )}
                                    <div className="mt-3 rounded-2xl bg-background/90 p-3 backdrop-blur">
                                        <div className="truncate text-sm font-semibold text-foreground">
                                            {payload.settings.branding.defaultTitle}
                                        </div>
                                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                            {payload.settings.branding.defaultDescription}
                                        </div>
                                        <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                            Open Graph share preview
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-4">
                            <div className="text-sm font-semibold text-foreground">Kisa Ogretici</div>
                            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                                {brandingGuide.map((item) => (
                                    <div key={item} className="flex gap-2">
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                                <div className="rounded-xl border border-border/70 bg-background px-3 py-3 text-xs text-muted-foreground">
                                    Root-relative yol (`/og-cover.png`) otomatik preview edilir. Tam URL kaydedilebilir ama guvenlik nedeniyle admin panelde otomatik yuklenmez. Upload slice geldikten sonra bu alanlar dogrudan medya secicisine baglanacak.
                                </div>
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>
            ) : null}

            {activeSection === "platform" ? (
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
            ) : null}

            {activeSection === "economy" ? (
            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle className="text-xl">Ekonomi Temeli</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                            <FieldLabel label="Baslangic Coin" helper="Yeni kayit olan kullanicinin wallet bakiyesi." />
                            <input className={inputClassName} type="number" min="0" value={payload.settings.economy.startingCoinBalance} onChange={(event) => updatePayload("economy", "startingCoinBalance", Number(event.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Galibiyet Odulu" helper="Mac kazanana verilecek baz coin." />
                            <input className={inputClassName} type="number" min="0" value={payload.settings.economy.winRewardCoin} onChange={(event) => updatePayload("economy", "winRewardCoin", Number(event.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Maglubiyet Odulu" helper="Kaybeden oyuncuya verilecek baz coin." />
                            <input className={inputClassName} type="number" min="0" value={payload.settings.economy.lossRewardCoin} onChange={(event) => updatePayload("economy", "lossRewardCoin", Number(event.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Beraberlik Odulu" helper="Mac berabere biterse verilecek baz coin." />
                            <input className={inputClassName} type="number" min="0" value={payload.settings.economy.drawRewardCoin} onChange={(event) => updatePayload("economy", "drawRewardCoin", Number(event.target.value))} />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="space-y-2">
                            <FieldLabel label="Mac Coin Carpani" helper="Tum mac odullerine uygulanan global multiplier." />
                            <input className={inputClassName} type="number" min="0" max="10" step="0.1" value={payload.settings.economy.matchCoinMultiplier} onChange={(event) => updatePayload("economy", "matchCoinMultiplier", Number(event.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Weekend Carpani" helper="Hafta sonu aktifse global carpana eklenir." />
                            <input className={inputClassName} type="number" min="1" max="10" step="0.1" value={payload.settings.economy.weekendCoinMultiplier} onChange={(event) => updatePayload("economy", "weekendCoinMultiplier", Number(event.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel label="Magaza Fiyat Carpani" helper="Tum item ve bundle liste fiyatlarina runtime uygulanir." />
                            <input className={inputClassName} type="number" min="0.1" max="10" step="0.1" value={payload.settings.economy.storePriceMultiplier} onChange={(event) => updatePayload("economy", "storePriceMultiplier", Number(event.target.value))} />
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <ToggleField checked={payload.settings.economy.weekendCoinMultiplierEnabled} label="Weekend Boost" description="Cumartesi/Pazar odullerine ek multiplier uygular." onChange={(checked) => updatePayload("economy", "weekendCoinMultiplierEnabled", checked)} />
                        <ToggleField checked={payload.settings.economy.bundlesEnabled} label="Bundle Satislari" description="Bundle katalogu ve satin alma akislarini acar/kapatir." onChange={(checked) => updatePayload("economy", "bundlesEnabled", checked)} />
                        <ToggleField checked={payload.settings.economy.discountCampaignsEnabled} label="Kampanya Indirimleri" description="Discount campaign fiyat dusumlerini runtime kapatir/acar." onChange={(checked) => updatePayload("economy", "discountCampaignsEnabled", checked)} />
                        <ToggleField checked={payload.settings.economy.couponsEnabled} label="Kuponlar" description="Coupon preview ve coupon checkout davranisini acar/kapatir." onChange={(checked) => updatePayload("economy", "couponsEnabled", checked)} />
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                        Canli sonuc ozeti:
                        <span className="ml-2 font-semibold text-foreground">
                            Mac multiplier x{payload.settings.economy.matchCoinMultiplier.toFixed(2)}
                        </span>
                        <span className="ml-4 font-semibold text-foreground">
                            Store multiplier x{payload.settings.economy.storePriceMultiplier.toFixed(2)}
                        </span>
                        {payload.settings.economy.weekendCoinMultiplierEnabled ? (
                            <span className="ml-4 font-semibold text-foreground">
                                Weekend x{payload.settings.economy.weekendCoinMultiplier.toFixed(2)}
                            </span>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
            ) : null}

            {activeSection === "security" ? (
            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5" />Captcha Hazirligi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <ProviderBadge enabled={payload.captchaReadiness.turnstileConfigured} label="Turnstile" />
                        <ProviderBadge enabled={payload.captchaReadiness.recaptchaConfigured} label="reCAPTCHA" />
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Aktif provider:</span>{" "}
                        {payload.settings.security.captcha.provider === "recaptcha_v3" ? "reCAPTCHA v3" : "Turnstile"}
                        <span className="mx-2 text-border">|</span>
                        <span className="font-semibold text-foreground">Policy:</span>{" "}
                        {isProductionBuild
                            ? "Production strict enforced"
                            : `Non-production ${payload.settings.security.captcha.failMode}`}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <ToggleField checked={payload.settings.security.captcha.enabled} label="Captcha Aktif" description="Captcha enforcement register, login ve room entry akislarina baglidir. Buradan runtime davranisini yonetirsin." onChange={(checked) => updateCaptcha("enabled", checked)} />
                        <ToggleField checked={payload.settings.security.captcha.onRegister} label="Register'da Kullan" description="Kayit akisinda captcha zorunlulugu." onChange={(checked) => updateCaptcha("onRegister", checked)} />
                        <ToggleField checked={payload.settings.security.captcha.onRoomCreate} label="Oda Olusturmada Kullan" description="Abuse dalgasinda create akisina uygulanir." onChange={(checked) => updateCaptcha("onRoomCreate", checked)} />
                        <ToggleField checked={payload.settings.security.captcha.onGuestJoin} label="Guest Join'de Kullan" description="Misafir katilim akisinda acar/kapatir." onChange={(checked) => updateCaptcha("onGuestJoin", checked)} />
                        <ToggleField checked={payload.settings.security.captcha.onLogin} label="Login'de Kullan" description="Supheli giris dalgasinda sonradan devreye alinabilir." onChange={(checked) => updateCaptcha("onLogin", checked)} />
                        {payload.settings.security.captcha.provider === "turnstile" ? (
                            <ToggleField checked={payload.settings.security.captcha.turnstileInteractiveFallback} label="Interactive Fallback" description="Turnstile managed modda supheli isteklerde interaktif challenge fallback kullanir." onChange={(checked) => updateCaptcha("turnstileInteractiveFallback", checked)} />
                        ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <FieldLabel label="Provider" helper="Ayni anda tek provider aktif tutulur." />
                            <select className={inputClassName} value={payload.settings.security.captcha.provider} onChange={(event) => updateCaptcha("provider", event.target.value as SystemSettingsResponse["settings"]["security"]["captcha"]["provider"])}>
                                <option value="turnstile">turnstile</option>
                                <option value="recaptcha_v3">recaptcha_v3</option>
                            </select>
                        </div>
                        {payload.settings.security.captcha.provider === "turnstile" ? (
                            <div className="space-y-2">
                                <FieldLabel label="Turnstile Modu" helper="Invisible varsayilan dusuk surtunmeli akistir. Production'da provider bozulursa strict fail uygulanir." />
                                <select className={inputClassName} value={payload.settings.security.captcha.turnstileMode} onChange={(event) => updateCaptcha("turnstileMode", event.target.value as SystemSettingsResponse["settings"]["security"]["captcha"]["turnstileMode"])}>
                                    <option value="invisible">invisible</option>
                                    <option value="non_interactive">non_interactive</option>
                                    <option value="managed">managed</option>
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <FieldLabel label="Provider Policy" helper="reCAPTCHA seciliyken production ortaminda strict enforcement uygulanir." />
                                <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                                    Yedek provider olarak saklanir. Gerektiginde operator bilincli sekilde Turnstile yerine buna gecer.
                                </div>
                            </div>
                        )}
                        {payload.settings.security.captcha.provider === "recaptcha_v3" ? (
                            <div className="space-y-2">
                            <FieldLabel label="reCAPTCHA Score" helper="0 ile 1 arasinda skor esigi." />
                            <input className={inputClassName} type="number" min="0" max="1" step="0.05" value={payload.settings.security.captcha.recaptchaScoreThreshold} onChange={(event) => updateCaptcha("recaptchaScoreThreshold", Number(event.target.value))} />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <FieldLabel label="Provider Health" helper="Turnstile seciliyken gizli key/site key hazirligi ayrica kontrol edilmelidir." />
                                <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                                    Invisible mod, oyuncuya checkbox gostermeden token almaya calisir. Gerekirse operator managed moda gecebilir.
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            ) : null}
        </div>
    );
}





