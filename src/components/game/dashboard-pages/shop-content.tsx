"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { useSession } from "next-auth/react";
import { BadgePercent, Frame, Gem, Gift, Layers3, ShoppingBag, Sparkles, TicketPercent, UserCircle } from "lucide-react";
import { CoinBadge, CoinMark } from "@/components/ui/coin-badge";
import { cn } from "@/lib/utils";
import {
    SHOP_RARITY_BADGE_CLASS,
    SHOP_RARITY_BUY_BUTTON_CLASS,
    SHOP_RARITY_CARD_CLASS,
    SHOP_RARITY_HALO_CLASS,
    SHOP_RARITY_TOP_STRIP_CLASS,
} from "@/lib/store/shop-admin";
import { resolveCardBackTheme } from "@/lib/cosmetics/card-back";
import { resolveCardFaceTheme } from "@/lib/cosmetics/card-face";
import { buildCosmeticPatternStyle, getCosmeticMotionClass, getCosmeticMotionStyle } from "@/lib/cosmetics/effects";
import { resolveFrameTheme } from "@/lib/cosmetics/frame";
import type { CatalogBundleView, CatalogStoreItemView, CouponPreviewResponse, StoreCatalogResponse, StoreItemType } from "@/types/economy";
import type { CoinGrantRedeemResult } from "@/types/coin-grants";
import { dispatchWalletUpdated } from "@/lib/wallet-events";

type ShopCategory = "all" | StoreItemType;
type BusyTarget = { kind: "shop_item" | "bundle"; id: number } | null;
type LayoutMode = "dashboard" | "page";
type FeedbackTone = "success" | "error";
type SelectedOffer = { kind: "item"; item: CatalogStoreItemView } | { kind: "bundle"; bundle: CatalogBundleView } | null;

interface ShopContentProps {
    layout?: LayoutMode;
}

const categories: { id: ShopCategory; icon: typeof ShoppingBag; label: string }[] = [
    { id: "all", icon: ShoppingBag, label: "Tüm Ürünler" },
    { id: "avatar", icon: UserCircle, label: "Avatarlar" },
    { id: "frame", icon: Frame, label: "Çerçeveler" },
    { id: "card_back", icon: Layers3, label: "Kart Arkaları" },
    { id: "card_face", icon: Layers3, label: "Kart Önleri" },
];

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

function getItemInitial(name: string) {
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
}

function createEmptyCatalog(): StoreCatalogResponse {
    return {
        coinBalance: 0,
        items: [],
        bundles: [],
        liveops: {
            bundlesEnabled: true,
            couponsEnabled: true,
            discountCampaignsEnabled: true,
            storePriceMultiplier: 1,
            activeMatchCoinMultiplier: 1,
            weekendBoostApplied: false,
        },
    };
}

function formatItemTypeLabel(type: StoreItemType) {
    if (type === "avatar") return "Avatar";
    if (type === "frame") return "Çerçeve";
    if (type === "card_back") return "Kart Arkası";
    return "Kart Önü";
}

function createSelection(catalog: StoreCatalogResponse, currentCategory: ShopCategory): SelectedOffer {
    const eligibleItems = currentCategory === "all" ? catalog.items : catalog.items.filter((item) => item.type === currentCategory);
    const pickedItem = eligibleItems.find((item) => item.isFeatured) ?? eligibleItems[0];
    if (pickedItem) return { kind: "item", item: pickedItem };
    const pickedBundle = catalog.bundles.find((bundle) => bundle.pricing.discountCoin > 0) ?? catalog.bundles[0];
    return pickedBundle ? { kind: "bundle", bundle: pickedBundle } : null;
}

function syncSelection(previous: SelectedOffer, catalog: StoreCatalogResponse, currentCategory: ShopCategory): SelectedOffer {
    if (!previous) return createSelection(catalog, currentCategory);
    if (previous.kind === "item") {
        const nextItem = catalog.items.find((item) => item.id === previous.item.id);
        if (nextItem && (currentCategory === "all" || nextItem.type === currentCategory)) {
            return { kind: "item", item: nextItem };
        }
        return createSelection(catalog, currentCategory);
    }
    const nextBundle = catalog.bundles.find((bundle) => bundle.id === previous.bundle.id);
    return nextBundle ? { kind: "bundle", bundle: nextBundle } : createSelection(catalog, currentCategory);
}

function FeedbackBanner({ tone, children }: { tone: "neutral" | "success" | "error"; children: ReactNode }) {
    return (
        <div className={cn(
            "mb-6 rounded-[24px] border px-4 py-3 text-sm font-medium shadow-sm",
            tone === "neutral" && "border-slate-200/70 bg-white/70 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-200",
            tone === "success" && "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200",
            tone === "error" && "border-rose-200/70 bg-rose-50/80 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200",
        )}>{children}</div>
    );
}

function ControlCard({ title, icon, description, children }: { title: string; icon: ReactNode; description: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-2 rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/45">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{icon}{title}</div>
            {children}
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
    );
}

function MetricPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" | "danger" }) {
    return (
        <div className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
            tone === "warning" && "border-amber-300/80 bg-amber-50/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
            tone === "danger" && "border-rose-300/80 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300",
            tone === "neutral" && "border-slate-200/80 bg-white/70 text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300",
        )}><span>{label}</span><span>{value}</span></div>
    );
}

export function ShopContent({ layout = "dashboard" }: ShopContentProps) {
    const { data: session } = useSession();
    const [category, setCategory] = useState<ShopCategory>("all");
    const [catalog, setCatalog] = useState<StoreCatalogResponse>(createEmptyCatalog);
    const [couponCode, setCouponCode] = useState("");
    const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
    const [coinGrantCode, setCoinGrantCode] = useState("");
    const [coinGrantFeedback, setCoinGrantFeedback] = useState<string | null>(null);
    const [coinGrantFeedbackTone, setCoinGrantFeedbackTone] = useState<FeedbackTone>("success");
    const [redeemingCoinGrant, setRedeemingCoinGrant] = useState(false);
    const [busyTarget, setBusyTarget] = useState<BusyTarget>(null);
    const [selectedOffer, setSelectedOffer] = useState<SelectedOffer>(null);

    useEffect(() => {
        if (!session?.user) return;
        const load = async () => {
            try {
                const response = await fetch("/api/store/catalog", { cache: "no-store" });
                if (!response.ok) return;
                const payload = (await response.json()) as StoreCatalogResponse;
                setCatalog(payload);
                setSelectedOffer((current) => syncSelection(current, payload, category));
            } catch {}
        };
        void load();
    }, [session, category]);

    const filteredItems = useMemo(() => category === "all" ? catalog.items : catalog.items.filter((item) => item.type === category), [catalog.items, category]);
    const featuredItems = useMemo(() => {
        const source = filteredItems.filter((item) => item.isFeatured || item.pricing.discountCoin > 0);
        return (source.length > 0 ? source : filteredItems).slice(0, 3);
    }, [filteredItems]);
    const activeOffers = useMemo(() => {
        const itemOffers = catalog.items.filter((item) => item.pricing.discountCoin > 0).map((item) => ({ key: `item:${item.id}`, title: item.name, detail: `${item.pricing.discountCoin} coin indirim` }));
        const bundleOffers = catalog.bundles.filter((bundle) => bundle.pricing.discountCoin > 0).map((bundle) => ({ key: `bundle:${bundle.id}`, title: bundle.name, detail: `${bundle.pricing.discountCoin} coin indirim` }));
        return [...itemOffers, ...bundleOffers].slice(0, 4);
    }, [catalog.bundles, catalog.items]);
    const busyKey = busyTarget ? `${busyTarget.kind}:${busyTarget.id}` : null;

    const applyOwnedItems = (awardedItemIds: number[], nextCoinBalance: number) => {
        const awardedSet = new Set(awardedItemIds);
        setCatalog((currentCatalog) => {
            const nextCatalog = {
                coinBalance: nextCoinBalance,
                items: currentCatalog.items.map((item) => awardedSet.has(item.id) ? { ...item, owned: true } : item),
                bundles: currentCatalog.bundles.map((bundle) => {
                    const ownedItemCount = bundle.items.filter((entry) => awardedSet.has(entry.shopItemId)).length + bundle.ownedItemCount;
                    return { ...bundle, ownedItemCount, fullyOwned: ownedItemCount >= bundle.items.length && bundle.items.length > 0 };
                }),
                liveops: currentCatalog.liveops,
            };
            setSelectedOffer((current) => syncSelection(current, nextCatalog, category));
            return nextCatalog;
        });
    };
    const handleBuyItem = async (item: CatalogStoreItemView) => {
        if (busyTarget || item.owned) return;
        setBusyTarget({ kind: "shop_item", id: item.id });
        try {
            const response = await fetch("/api/store/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shopItemId: item.id, couponCode: couponCode.trim() || undefined }),
            });
            const payload = (await response.json()) as { coinBalance?: number; finalPriceCoin?: number; error?: string };
            if (!response.ok) {
                setCouponFeedback(payload.error || "Satın alma başarısız.");
                return;
            }
            applyOwnedItems([item.id], payload.coinBalance ?? catalog.coinBalance);
            if (payload.coinBalance !== undefined) {
                dispatchWalletUpdated({ coinBalance: payload.coinBalance, source: "store_purchase" });
            }
            setCouponFeedback(payload.finalPriceCoin !== undefined ? `Satın alındı: ${payload.finalPriceCoin} coin` : null);
        } catch {
            setCouponFeedback("Satın alma isteği tamamlanamadı.");
        } finally {
            setBusyTarget(null);
        }
    };

    const handleBuyBundle = async (bundle: CatalogBundleView) => {
        if (busyTarget || bundle.fullyOwned) return;
        setBusyTarget({ kind: "bundle", id: bundle.id });
        try {
            const response = await fetch("/api/store/bundles/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bundleId: bundle.id, couponCode: couponCode.trim() || undefined }),
            });
            const payload = (await response.json()) as { awardedItems?: Array<{ id: number }>; coinBalance?: number; finalPriceCoin?: number; error?: string };
            if (!response.ok) {
                setCouponFeedback(payload.error || "Paket satın alma başarısız.");
                return;
            }
            const awardedItemIds = payload.awardedItems?.map((entry) => entry.id) ?? [];
            applyOwnedItems(awardedItemIds, payload.coinBalance ?? catalog.coinBalance);
            if (payload.coinBalance !== undefined) {
                dispatchWalletUpdated({ coinBalance: payload.coinBalance, source: "bundle_purchase" });
            }
            setCouponFeedback(payload.finalPriceCoin !== undefined ? `Paket satın alındı: ${payload.finalPriceCoin} coin` : null);
        } catch {
            setCouponFeedback("Paket satın alma isteği tamamlanamadı.");
        } finally {
            setBusyTarget(null);
        }
    };

    const handlePreviewCoupon = async (target: BusyTarget) => {
        const trimmedCouponCode = couponCode.trim();
        if (!target || !trimmedCouponCode) {
            setCouponFeedback("Kupon kodunu girip bir ürün veya paket seç.");
            return;
        }
        setBusyTarget(target);
        try {
            const response = await fetch("/api/store/coupons/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetKind: target.kind, targetId: target.id, couponCode: trimmedCouponCode }),
            });
            const payload = (await response.json()) as CouponPreviewResponse | { error?: string };
            if (!response.ok || !("valid" in payload)) {
                setCouponFeedback(("error" in payload && payload.error) ? payload.error : "Kupon doğrulanamadı.");
                return;
            }
            if (!payload.valid || !payload.pricing || !payload.coupon) {
                setCouponFeedback(payload.reason || "Kupon bu hedef için geçerli değil.");
                return;
            }
            setCouponFeedback(`${payload.coupon.code} uygulandı: ${payload.pricing.finalPriceCoin} coin`);
        } catch {
            setCouponFeedback("Kupon doğrulama isteği tamamlanamadı.");
        } finally {
            setBusyTarget(null);
        }
    };

    const handleRedeemCoinGrant = async () => {
        const trimmedCode = coinGrantCode.trim();
        if (!trimmedCode || redeemingCoinGrant) return;
        setRedeemingCoinGrant(true);
        setCoinGrantFeedback(null);
        try {
            const response = await fetch("/api/coin-grants/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: trimmedCode }),
            });
            const payload = (await response.json()) as CoinGrantRedeemResult | { error?: string };
            if (!response.ok || !("ok" in payload) || !payload.ok) {
                setCoinGrantFeedbackTone("error");
                setCoinGrantFeedback(("error" in payload && payload.error) ? payload.error : "Coin kodu kullanılamadı.");
                return;
            }
            setCatalog((currentCatalog) => ({ ...currentCatalog, coinBalance: payload.coinBalance }));
            dispatchWalletUpdated({ coinBalance: payload.coinBalance, source: "coin_grant" });
            setCoinGrantCode("");
            setCoinGrantFeedbackTone("success");
            setCoinGrantFeedback(`${payload.coinAmount} coin eklendi: ${payload.code.code}`);
        } catch {
            setCoinGrantFeedbackTone("error");
            setCoinGrantFeedback("Coin kodu isteği tamamlanamadı.");
        } finally {
            setRedeemingCoinGrant(false);
        }
    };

    const containerClassName = layout === "dashboard"
        ? "mx-auto flex w-full max-w-[1480px] flex-col px-4 py-5 md:px-6 md:py-6 xl:px-8"
        : "rounded-[28px] border border-zinc-200/70 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/70";

    return (
        <div className={containerClassName}>
            <header className="mb-6 rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(239,246,255,0.86),rgba(250,245,255,0.92))] p-5 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.4)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(17,24,39,0.86),rgba(30,27,75,0.88))] md:p-6 xl:p-7">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 max-w-4xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300"><Sparkles className="h-3.5 w-3.5" />Koleksiyon Mağazası</div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">Satın almadan önce ne aldığını gör.</h1>
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white dark:bg-slate-100 dark:text-slate-950">Canlı Fiyat</span>
                        </div>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-[15px]">Avatar, çerçeve ve kart kozmetiklerini önizle. İndirimleri, öne çıkan paketleri ve kupon etkisini tek yüzeyde görüp daha güvenli karar ver.</p>
                        <div className="mt-4 flex flex-wrap gap-2">{(["common", "rare", "epic", "legendary"] as const).map((rarity) => (<div key={rarity} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${SHOP_RARITY_CARD_CLASS[rarity]}`}><Gem size={12} />{rarity}</div>))}</div>
                        {activeOffers.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{activeOffers.map((offer) => (<div key={offer.key} className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"><BadgePercent size={12} /><span>{offer.title}</span><span className="text-emerald-500">{offer.detail}</span></div>))}</div> : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
                        <CoinBadge value={catalog.coinBalance} label="Coin Bakiyesi" className="rounded-[24px] px-4 py-4" valueClassName="text-2xl" />
                        <div className="rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/45">
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Canlı Çarpanlar</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <MetricPill label="Mağaza" value={`x${catalog.liveops.storePriceMultiplier.toFixed(2)}`} />
                                <MetricPill label="Maç" value={`x${catalog.liveops.activeMatchCoinMultiplier.toFixed(2)}`} />
                                {catalog.liveops.weekendBoostApplied ? <MetricPill label="Bonus" value="Hafta Sonu" tone="warning" /> : null}
                                {!catalog.liveops.discountCampaignsEnabled ? <MetricPill label="Kampanya" value="Duraklatıldı" tone="danger" /> : null}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <div className="mb-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="grid gap-3 lg:grid-cols-3">{featuredItems.map((item) => (<FeaturedSpotlightCard key={item.id} item={item} selected={selectedOffer?.kind === "item" && selectedOffer.item.id === item.id} onSelect={() => setSelectedOffer({ kind: "item", item })} />))}</div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <ControlCard title="Kupon" icon={<TicketPercent size={12} />} description={catalog.liveops.couponsEnabled ? "Kod sonraki satın almaya eklenir. Geçerlilik her istekte sunucuda doğrulanır." : "Kupon kullanımı şu anda geçici olarak kapalı."}>
                        <div className="flex gap-2">
                            <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="WELCOME25" disabled={!catalog.liveops.couponsEnabled} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                            <button type="button" onClick={() => setCouponFeedback("Kuponu, seçtiğin ürün ya da pakette önizleyebilirsin.")} disabled={!catalog.liveops.couponsEnabled} className="rounded-2xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Kullan</button>
                        </div>
                    </ControlCard>
                    <ControlCard title="Coin Kodu" icon={<Gift size={12} />} description="Etkinlik veya içerik üreticisi kodunu burada kullan. Onaylanırsa coin bakiyen hemen güncellenir.">
                        <div className="flex gap-2">
                            <input value={coinGrantCode} onChange={(event) => { setCoinGrantCode(event.target.value.toUpperCase()); if (coinGrantFeedback) setCoinGrantFeedback(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleRedeemCoinGrant(); } }} placeholder="CREATOR-AB12CD" maxLength={80} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 outline-none transition focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                            <button type="button" onClick={() => void handleRedeemCoinGrant()} disabled={redeemingCoinGrant || !coinGrantCode.trim()} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">{redeemingCoinGrant ? "..." : "Kullan"}</button>
                        </div>
                    </ControlCard>
                </div>
            </div>
            {couponFeedback ? <FeedbackBanner tone="neutral">{couponFeedback}</FeedbackBanner> : null}
            {coinGrantFeedback ? <FeedbackBanner tone={coinGrantFeedbackTone === "success" ? "success" : "error"}>{coinGrantFeedback}</FeedbackBanner> : null}
            <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_380px]">
                <aside className="flex w-full shrink-0 flex-row gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
                    {categories.map((shopCategory) => {
                        const Icon = shopCategory.icon;
                        const active = category === shopCategory.id;
                        return (
                            <button key={shopCategory.id} onClick={() => { setCategory(shopCategory.id); setSelectedOffer(createSelection(catalog, shopCategory.id)); }} className={cn("flex items-center gap-3 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-semibold transition-all", active ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/25 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950" : "border-white/60 bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-slate-900")} type="button"><Icon size={18} />{shopCategory.label}</button>
                        );
                    })}
                </aside>
                <div className="min-w-0 space-y-8 pb-4">
                    <section className="rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_22px_70px_-44px_rgba(15,23,42,0.42)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/45 md:p-6">
                        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900 dark:text-white">Ürünler <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{filteredItems.length}</span></h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kategoriye göre filtrelenmiş koleksiyon. Kartı seçip sağda detaylı önizleme görebilirsin.</p>
                            </div>
                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{filteredItems.length} Ürün</div>
                        </div>
                        {filteredItems.length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-300/60 bg-white/30 p-10 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400">Bu kategoride aktif ürün yok. Yeni ürünler eklendiğinde burada görünür.</div> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4">{filteredItems.map((item) => (<ShopItemCard key={item.id} item={item} selected={selectedOffer?.kind === "item" && selectedOffer.item.id === item.id} onSelect={() => setSelectedOffer({ kind: "item", item })} onBuy={handleBuyItem} onPreviewCoupon={() => void handlePreviewCoupon({ kind: "shop_item", id: item.id })} busy={busyKey === `shop_item:${item.id}`} couponReady={catalog.liveops.couponsEnabled && couponCode.trim().length > 0} itemInitial={getItemInitial(item.name)} />))}</div>}
                    </section>
                    <section className="rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_22px_70px_-44px_rgba(15,23,42,0.42)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/45 md:p-6">
                        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Öne Çıkan Paketler</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tek seferde birden fazla kozmetik almak için düzenlenmiş teklif setleri.</p>
                            </div>
                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{catalog.bundles.length} Paket</div>
                        </div>
                        {catalog.bundles.length === 0 ? <div className="rounded-[24px] border border-dashed border-slate-300/60 bg-white/30 p-10 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400">{catalog.liveops.bundlesEnabled ? "Aktif paket yok." : "Paket satışları geçici olarak kapalı."}</div> : <div className="grid gap-4 2xl:grid-cols-2">{catalog.bundles.map((bundle) => (<BundleCard key={bundle.id} bundle={bundle} selected={selectedOffer?.kind === "bundle" && selectedOffer.bundle.id === bundle.id} couponReady={catalog.liveops.couponsEnabled && couponCode.trim().length > 0} busy={busyKey === `bundle:${bundle.id}`} onSelect={() => setSelectedOffer({ kind: "bundle", bundle })} onBuy={handleBuyBundle} onPreviewCoupon={() => void handlePreviewCoupon({ kind: "bundle", id: bundle.id })} />))}</div>}
                    </section>
                </div>
                <aside className="xl:sticky xl:top-6 xl:self-start"><StorePreviewPanel selection={selectedOffer} couponReady={catalog.liveops.couponsEnabled && couponCode.trim().length > 0} busyKey={busyKey} onBuyItem={handleBuyItem} onBuyBundle={handleBuyBundle} onPreviewCoupon={handlePreviewCoupon} /></aside>
            </div>
        </div>
    );
}

function FeaturedSpotlightCard({ item, selected, onSelect }: { item: CatalogStoreItemView; selected: boolean; onSelect: () => void }) {
    return (
        <button type="button" onClick={onSelect} className={cn("group relative overflow-hidden rounded-[28px] border p-4 text-left transition-all hover:-translate-y-1", selected ? "border-slate-900 bg-slate-900 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.7)] dark:border-white dark:bg-white dark:text-slate-950" : `${SHOP_RARITY_CARD_CLASS[item.rarity]} ${SHOP_RARITY_HALO_CLASS[item.rarity]}`)}>
            <div className={cn("absolute inset-x-4 top-0 h-1 rounded-b-full opacity-80", SHOP_RARITY_TOP_STRIP_CLASS[item.rarity])} />
            <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{item.isFeatured ? "Öne Çıkan" : formatItemTypeLabel(item.type)}</div><h3 className="mt-2 text-base font-black tracking-tight">{item.name}</h3></div><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]", selected ? "bg-white/15 text-current dark:bg-slate-900/10" : SHOP_RARITY_BADGE_CLASS[item.rarity])}>{item.rarity}</span></div>
            <div className="mt-4 flex items-end justify-between gap-4"><StoreMerchMiniPreview item={item} /><div className="text-right">{item.pricing.discountCoin > 0 ? <div className="text-xs opacity-60 line-through">{item.pricing.basePriceCoin.toLocaleString()} coin</div> : null}<div className="flex items-center justify-end gap-1 text-sm font-black">{item.pricing.finalPriceCoin.toLocaleString()}<CoinMark className="h-6 w-6" iconClassName="h-3 w-3" /></div></div></div>
        </button>
    );
}
function ShopItemCard({ item, selected, onSelect, onBuy, onPreviewCoupon, busy, couponReady, itemInitial }: { item: CatalogStoreItemView; selected: boolean; onSelect: () => void; onBuy: (item: CatalogStoreItemView) => void; onPreviewCoupon: () => void; busy: boolean; couponReady: boolean; itemInitial: string }) {
    const buttonLabel = item.equipped ? "Kullanılıyor" : item.owned ? "Sahipsin" : busy ? "Alınıyor..." : "Satın Al";
    const buttonStyle = item.owned ? (item.equipped ? "bg-blue-500 text-white cursor-default" : "bg-green-500 text-white cursor-default") : SHOP_RARITY_BUY_BUTTON_CLASS[item.rarity];
    return (
        <article className={cn("group relative rounded-[26px] border p-3 transition-all hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-slate-900/70", item.isFeatured ? "border-fuchsia-200/80 bg-gradient-to-b from-white/85 to-fuchsia-50/60 dark:border-fuchsia-900/50 dark:from-slate-900/70 dark:to-fuchsia-950/20" : SHOP_RARITY_CARD_CLASS[item.rarity], SHOP_RARITY_HALO_CLASS[item.rarity], selected && "ring-2 ring-slate-900/15 dark:ring-white/15")}>
            <button type="button" onClick={onSelect} className="absolute inset-0 rounded-[26px]" aria-label={`${item.name} detayını aç`} />
            <div className={cn("absolute inset-x-4 top-0 h-1 rounded-b-full opacity-80", SHOP_RARITY_TOP_STRIP_CLASS[item.rarity])} />
            <div className="relative z-10">
                <div className="relative mb-3 aspect-[0.95/1] overflow-hidden rounded-[20px] border border-white/40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent_55%),linear-gradient(180deg,rgba(241,245,249,0.92),rgba(226,232,240,0.82))] dark:border-white/5 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.92))]">
                    {item.badgeText ? <div className="absolute left-2 top-2 z-10"><span className="rounded-full bg-blue-600/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm">{item.badgeText}</span></div> : null}
                    <div className="absolute right-2 top-2 z-10"><span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm backdrop-blur-sm ${SHOP_RARITY_BADGE_CLASS[item.rarity]}`}>{item.rarity}</span></div>
                    <div className="flex h-full w-full items-center justify-center p-4"><StoreMerchMiniPreview item={item} itemInitial={itemInitial} /></div>
                </div>
                <h4 className="truncate text-sm font-black text-slate-900 dark:text-white">{item.name}</h4>
                <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{formatItemTypeLabel(item.type)}</div>
                {item.pricing.appliedPromotion ? <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><BadgePercent size={10} />{item.pricing.appliedPromotion.name}</div> : null}
                <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="flex flex-col">{item.pricing.discountCoin > 0 ? <span className="text-[11px] text-slate-400 line-through">{item.pricing.basePriceCoin.toLocaleString()}</span> : null}<span className="flex items-center gap-1 text-xs font-black text-amber-500">{item.pricing.finalPriceCoin.toLocaleString()}<CoinMark className="h-4 w-4 ring-0 shadow-none" iconClassName="h-2.5 w-2.5" /></span></div>
                    <div className="relative z-10 flex items-center gap-2">{couponReady && !item.owned ? <button type="button" onClick={onPreviewCoupon} disabled={busy} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">Kupon</button> : null}<button onClick={() => onBuy(item)} disabled={busy || item.owned} className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition-all disabled:opacity-50 ${buttonStyle}`} type="button">{buttonLabel}</button></div>
                </div>
            </div>
        </article>
    );
}

function BundleCard({ bundle, selected, couponReady, busy, onSelect, onBuy, onPreviewCoupon }: { bundle: CatalogBundleView; selected: boolean; couponReady: boolean; busy: boolean; onSelect: () => void; onBuy: (bundle: CatalogBundleView) => void; onPreviewCoupon: () => void }) {
    const disabled = busy || bundle.fullyOwned || bundle.ownedItemCount > 0;
    return (
        <article className={cn("rounded-[28px] border bg-gradient-to-br from-white/85 via-slate-50/80 to-white/70 p-5 shadow-sm transition-all dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-950/60", selected ? "border-slate-900/20 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.55)] dark:border-white/15" : "border-slate-200/70 dark:border-slate-700/50")}>
            <div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white dark:bg-slate-100 dark:text-slate-900">Paket</div><h4 className="mt-3 text-2xl font-black tracking-tight text-slate-800 dark:text-white">{bundle.name}</h4><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{bundle.description}</p></div><CoinBadge value={bundle.pricing.finalPriceCoin} label="Paket Fiyatı" className="min-w-[132px] px-3 py-2" valueClassName="text-base" /></div>
            <div className="mt-5 flex flex-wrap gap-2">{bundle.items.map((item) => (<div key={item.id} className={`rounded-full border px-3 py-1 text-xs font-semibold ${SHOP_RARITY_CARD_CLASS[item.itemRarity]}`}>{item.itemName}</div>))}</div>
            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-col gap-1 text-sm">{bundle.pricing.discountCoin > 0 ? <span className="text-slate-400 line-through">{bundle.pricing.basePriceCoin.toLocaleString()} coin</span> : null}<span className="font-semibold text-slate-600 dark:text-slate-300">{bundle.ownedItemCount > 0 ? `${bundle.ownedItemCount} ürüne zaten sahipsin` : `${bundle.items.length} kozmetik dahil`}</span></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={onSelect} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Önizle</button>{couponReady && !bundle.fullyOwned ? <button type="button" onClick={onPreviewCoupon} disabled={busy} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Kupon</button> : null}<button type="button" onClick={() => onBuy(bundle)} disabled={disabled} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">{bundle.fullyOwned ? "Sahipsin" : bundle.ownedItemCount > 0 ? "Sahip Olduğun Ürün Var" : busy ? "Alınıyor..." : "Paketi Satın Al"}</button></div></div>
        </article>
    );
}

function StorePreviewPanel({ selection, couponReady, busyKey, onBuyItem, onBuyBundle, onPreviewCoupon }: { selection: SelectedOffer; couponReady: boolean; busyKey: string | null; onBuyItem: (item: CatalogStoreItemView) => void; onBuyBundle: (bundle: CatalogBundleView) => void; onPreviewCoupon: (target: BusyTarget) => void }) {
    if (!selection) return <div className="rounded-[28px] border border-white/70 bg-white/72 p-5 text-sm text-slate-500 shadow-[0_22px_70px_-44px_rgba(15,23,42,0.42)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-400">Önizleme burada görünür. Soldan bir ürün veya paket seç.</div>;
    if (selection.kind === "bundle") {
        const bundle = selection.bundle;
        const busy = busyKey === `bundle:${bundle.id}`;
        const disabled = busy || bundle.fullyOwned || bundle.ownedItemCount > 0;
        return <div className="rounded-[30px] border border-white/70 bg-white/72 p-5 shadow-[0_26px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/45"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Paket Önizleme</div><h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{bundle.name}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{bundle.items.length} kozmetik • toplu teklif</p></div><span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white dark:bg-slate-100 dark:text-slate-950">Paket</span></div><div className="rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.12),_transparent_60%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(226,232,240,0.84))] p-4 dark:border-slate-800/70 dark:bg-[radial-gradient(circle_at_top,_rgba(192,132,252,0.12),_transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))]"><div className="grid grid-cols-2 gap-3">{bundle.items.slice(0, 4).map((item) => (<div key={item.id} className={`rounded-[20px] border p-3 text-center ${SHOP_RARITY_CARD_CLASS[item.itemRarity]}`}><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{formatItemTypeLabel(item.itemType)}</div><div className="mt-2 text-sm font-black text-slate-900 dark:text-white">{item.itemName}</div></div>))}</div></div><div className="mt-4 space-y-3"><p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{bundle.description}</p><div className="flex items-end justify-between gap-4"><div>{bundle.pricing.discountCoin > 0 ? <div className="text-sm text-slate-400 line-through">{bundle.pricing.basePriceCoin.toLocaleString()} coin</div> : null}<div className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">{bundle.pricing.finalPriceCoin.toLocaleString()}<CoinMark className="h-8 w-8" /></div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{bundle.ownedItemCount > 0 ? `${bundle.ownedItemCount} ürüne zaten sahipsin` : `${bundle.items.length} kozmetik dahil`}</div></div><div className="flex flex-wrap justify-end gap-2">{couponReady && !bundle.fullyOwned ? <button type="button" onClick={() => onPreviewCoupon({ kind: "bundle", id: bundle.id })} disabled={busy} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Kuponu Dene</button> : null}<button type="button" onClick={() => onBuyBundle(bundle)} disabled={disabled} className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">{bundle.fullyOwned ? "Sahipsin" : bundle.ownedItemCount > 0 ? "Sahip Olduğun Ürün Var" : busy ? "Alınıyor..." : "Paketi Satın Al"}</button></div></div></div></div>;
    }
    const item = selection.item;
    const busy = busyKey === `shop_item:${item.id}`;
    return <div className="rounded-[30px] border border-white/70 bg-white/72 p-5 shadow-[0_26px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/45"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Canlı Önizleme</div><h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{item.name}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatItemTypeLabel(item.type)} • {item.rarity}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${SHOP_RARITY_BADGE_CLASS[item.rarity]}`}>{item.rarity}</span></div><div className="rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_60%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(226,232,240,0.84))] p-4 dark:border-slate-800/70 dark:bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.12),_transparent_58%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))]"><StoreLargePreview item={item} /></div><div className="mt-4 space-y-3">{item.badgeText ? <div className="inline-flex rounded-full bg-blue-600/95 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">{item.badgeText}</div> : null}{item.pricing.appliedPromotion ? <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">Kampanya: {item.pricing.appliedPromotion.name}</div> : null}<div className="flex items-end justify-between gap-4"><div>{item.pricing.discountCoin > 0 ? <div className="text-sm text-slate-400 line-through">{item.pricing.basePriceCoin.toLocaleString()} coin</div> : null}<div className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">{item.pricing.finalPriceCoin.toLocaleString()}<CoinMark className="h-8 w-8" /></div></div><div className="flex flex-wrap justify-end gap-2">{couponReady && !item.owned ? <button type="button" onClick={() => onPreviewCoupon({ kind: "shop_item", id: item.id })} disabled={busy} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Kuponu Dene</button> : null}<button type="button" onClick={() => onBuyItem(item)} disabled={busy || item.owned} className={cn("rounded-2xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50", item.owned ? "bg-green-500 text-white" : SHOP_RARITY_BUY_BUTTON_CLASS[item.rarity])}>{item.equipped ? "Kullanılıyor" : item.owned ? "Sahipsin" : busy ? "Alınıyor..." : "Satın Al"}</button></div></div></div></div>;
}
function StoreMerchMiniPreview({ item, itemInitial }: { item: CatalogStoreItemView; itemInitial?: string }) {
    const initial = itemInitial ?? getItemInitial(item.name);
    if (item.type === "avatar") {
        return <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border border-white/50 bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-[0_18px_40px_-24px_rgba(59,130,246,0.55)] dark:border-white/10">{item.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={item.imageUrl} alt={item.name} width={80} height={80} className="h-full w-full object-cover" /> : <span className="text-2xl font-black text-white">{initial}</span>}</div>;
    }
    if (item.type === "frame") {
        const theme = resolveFrameTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
        const patternStyle = theme ? buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.accentColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity }) : null;
        return <div className="relative h-20 w-20"><div className="absolute inset-0 rounded-[24px]" style={theme ? { border: `${theme.thickness}px solid ${theme.accentColor}`, boxShadow: `0 0 ${theme.glowBlur}px ${theme.glowColor}${Math.round(theme.glowOpacity * 255).toString(16).padStart(2, "0")}` } : undefined} />{item.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={item.imageUrl} alt={item.name} fill className="rounded-[24px] object-cover opacity-85" /> : null}{patternStyle ? <div className={cn("absolute inset-0 rounded-[24px]", getCosmeticMotionClass(theme?.motionPreset ?? "none"))} style={{ ...patternStyle, ...getCosmeticMotionStyle(theme?.motionSpeedMs ?? 5000) }} /> : null}<div className="absolute inset-[12px] flex items-center justify-center rounded-[16px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-xl font-black text-white shadow-lg">{initial}</div></div>;
    }
    return <div className={cn("relative h-24 w-[74px] overflow-hidden rounded-[18px] border border-white/30 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.5)]", item.type === "card_back" ? "bg-slate-900 text-white" : "bg-white text-slate-900")}><StoreCardPreviewSurface item={item} compact /></div>;
}

function StoreLargePreview({ item }: { item: CatalogStoreItemView }) {
    if (item.type === "avatar") {
        return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="space-y-5 text-center"><div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-[36px] border border-white/20 bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-[0_24px_60px_-34px_rgba(59,130,246,0.65)]">{item.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={item.imageUrl} alt={item.name} width={144} height={144} className="h-full w-full object-cover" /> : <span className="text-5xl font-black text-white">{getItemInitial(item.name)}</span>}</div><div><div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Oyuncu Kutusu</div><div className="mt-2 text-lg font-black text-slate-900 dark:text-white">{item.name}</div></div></div></div>;
    }
    if (item.type === "frame") {
        const theme = resolveFrameTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
        const patternStyle = theme ? buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.accentColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity }) : null;
        return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="relative flex h-52 w-52 items-center justify-center"><div className="absolute inset-0 rounded-[40px]" style={theme ? { border: `${theme.thickness}px solid ${theme.accentColor}`, boxShadow: `0 0 ${theme.glowBlur}px ${theme.glowColor}${Math.round(theme.glowOpacity * 255).toString(16).padStart(2, "0")}` } : undefined} />{theme?.frameStyle && theme.frameStyle !== "solid" ? <div className="absolute inset-[12px] rounded-[32px] border" style={{ borderColor: theme.secondaryColor, opacity: theme.frameStyle === "double" ? 0.8 : 0.6 }} /> : null}{item.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={item.imageUrl} alt={item.name} fill className="rounded-[40px] object-cover opacity-85" /> : null}{patternStyle ? <div className={cn("absolute inset-0 rounded-[40px]", getCosmeticMotionClass(theme?.motionPreset ?? "none"))} style={{ ...patternStyle, ...getCosmeticMotionStyle(theme?.motionSpeedMs ?? 5000) }} /> : null}<div className="absolute inset-[32px] rounded-[26px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" /><div className="absolute inset-[54px] flex items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 text-4xl font-black text-white shadow-lg">{getItemInitial(item.name)}</div></div></div>;
    }
    return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="relative h-[260px] w-[190px] overflow-hidden rounded-[28px] border border-white/30 bg-slate-950 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.65)]"><StoreCardPreviewSurface item={item} /></div></div>;
}

function StoreCardPreviewSurface({ item, compact = false }: { item: CatalogStoreItemView; compact?: boolean }) {
    if (item.type === "card_back") {
        const theme = resolveCardBackTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
        const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.borderColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
        return <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.98))]">{theme.overlayImageUrl ? <Image loader={passthroughImageLoader} unoptimized src={theme.overlayImageUrl} alt={item.name} fill className="object-cover opacity-90" /> : null}<div className={cn("absolute inset-0", getCosmeticMotionClass(theme.motionPreset))} style={{ ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[10%] rounded-[20px] border-2" style={{ borderColor: theme.borderColor }} /><div className="absolute inset-[20%] rounded-[16px] border" style={{ borderColor: theme.secondaryColor }} /><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1),_transparent_55%)]" />{!compact ? <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-sm">Kart Arkası</div> : null}</div>;
    }
    const theme = resolveCardFaceTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
    const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.borderColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
    const overlayStyle = theme.overlayImageUrl ? { backgroundImage: `linear-gradient(rgba(255,255,255,${theme.overlayOpacity * 0.7}), rgba(255,255,255,${theme.overlayOpacity * 0.7})), url(${theme.overlayImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
    return <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.96))] text-slate-900"><div className="absolute inset-0" style={overlayStyle} /><div className={cn("absolute inset-[10px] rounded-[20px] border-2", getCosmeticMotionClass(theme.motionPreset))} style={{ borderColor: theme.borderColor, ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[18px] rounded-[16px] border bg-white/70 backdrop-blur-[1px]" style={{ borderColor: theme.secondaryColor }} /><div className="absolute inset-x-[22px] top-[22px] rounded-full bg-slate-900/85 px-3 py-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white">Tema</div><div className="absolute inset-x-6 top-[42%] -translate-y-1/2 text-center"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Kart Önü</div><div className="mt-2 text-lg font-black">{item.name}</div></div><div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 backdrop-blur-sm"><Sparkles className="h-3 w-3" />Oyun İçi</div></div>;
}
