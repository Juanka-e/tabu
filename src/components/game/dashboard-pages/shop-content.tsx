"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
    BadgePercent,
    Check,
    Eye,
    Frame,
    Gift,
    Layers3,
    LoaderCircle,
    Search,
    ShoppingBag,
    Sparkles,
    TicketPercent,
    UserCircle,
    X,
} from "lucide-react";
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
import type {
    CatalogBundleView,
    CatalogStoreItemView,
    CouponCatalogPreviewResponse,
    StoreCatalogResponse,
    StoreItemType,
} from "@/types/economy";
import type { CoinGrantRedeemResult } from "@/types/coin-grants";
import { dispatchWalletUpdated } from "@/lib/wallet-events";
import { dispatchNotificationsUpdated } from "@/lib/notification-events";

type ShopCategory = "all" | StoreItemType;
type BusyTarget = { kind: "shop_item" | "bundle"; id: number } | null;
type LayoutMode = "dashboard" | "page";
type UtilityMode = "coupon" | "coin_grant";
type PreviewOffer =
    | { kind: "item"; item: CatalogStoreItemView }
    | { kind: "bundle"; bundle: CatalogBundleView }
    | null;
type ActiveCouponPreview = Omit<CouponCatalogPreviewResponse, "coupon"> & {
    coupon: NonNullable<CouponCatalogPreviewResponse["coupon"]>;
};
type DisplayedPricing = {
    pricing: CatalogStoreItemView["pricing"] | CatalogBundleView["pricing"];
    coupon: ActiveCouponPreview["coupon"] | null;
    couponApplied: boolean;
    referencePriceCoin: number;
};

interface ShopContentProps {
    layout?: LayoutMode;
}

const categories: { id: ShopCategory; icon: typeof ShoppingBag; label: string }[] = [
    { id: "all", icon: ShoppingBag, label: "Tümü" },
    { id: "avatar", icon: UserCircle, label: "Avatar" },
    { id: "frame", icon: Frame, label: "Çerçeve" },
    { id: "card_back", icon: Layers3, label: "Kart Arkası" },
    { id: "card_face", icon: Layers3, label: "Kart Önü" },
];

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

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

function getItemInitial(name: string) {
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
}

function applyHexAlpha(hex: string, opacity: number) {
    return `${hex}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export function ShopContent({ layout = "dashboard" }: ShopContentProps) {
    const { data: session } = useSession();
    const [category, setCategory] = useState<ShopCategory>("all");
    const [catalog, setCatalog] = useState<StoreCatalogResponse>(createEmptyCatalog);
    const [couponCode, setCouponCode] = useState("");
    const [coinGrantCode, setCoinGrantCode] = useState("");
    const [redeemingCoinGrant, setRedeemingCoinGrant] = useState(false);
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [busyTarget, setBusyTarget] = useState<BusyTarget>(null);
    const [previewOffer, setPreviewOffer] = useState<PreviewOffer>(null);
    const [utilityMode, setUtilityMode] = useState<UtilityMode>("coupon");
    const [activeCouponPreview, setActiveCouponPreview] = useState<ActiveCouponPreview | null>(null);

    useEffect(() => {
        if (!session?.user) {
            return;
        }

        const load = async () => {
            try {
                const response = await fetch("/api/store/catalog", { cache: "no-store" });
                if (!response.ok) {
                    return;
                }
                const payload = (await response.json()) as StoreCatalogResponse;
                setCatalog(payload);
            } catch {
                // Keep previous catalog state.
            }
        };

        void load();
    }, [session]);

    const searchQuery = searchTerm.trim().toLocaleLowerCase("tr-TR");

    const filteredItems = useMemo(() => {
        const categoryItems = category === "all"
            ? catalog.items
            : catalog.items.filter((item) => item.type === category);

        if (!searchQuery) {
            return categoryItems;
        }

        return categoryItems.filter((item) =>
            [item.name, item.code, item.badgeText ?? "", formatItemTypeLabel(item.type)]
                .join(" ")
                .toLocaleLowerCase("tr-TR")
                .includes(searchQuery)
        );
    }, [catalog.items, category, searchQuery]);

    const filteredBundles = useMemo(() => {
        if (!searchQuery) {
            return catalog.bundles;
        }

        return catalog.bundles.filter((bundle) =>
            [bundle.name, bundle.code, bundle.description ?? "", ...bundle.items.map((entry) => entry.itemName)]
                .join(" ")
                .toLocaleLowerCase("tr-TR")
                .includes(searchQuery)
        );
    }, [catalog.bundles, searchQuery]);

    const featuredItems = useMemo(() => {
        const adminFeatured = filteredItems.filter((item) => item.isFeatured);
        if (adminFeatured.length > 0) {
            return adminFeatured.slice(0, 3);
        }
        const discounted = filteredItems.filter((item) => item.pricing.discountCoin > 0);
        return (discounted.length > 0 ? discounted : filteredItems).slice(0, 3);
    }, [filteredItems]);

    const catalogItemMap = useMemo(
        () => new Map(catalog.items.map((item) => [item.id, item])),
        [catalog.items]
    );

    const discountedOffers = useMemo(() => {
        const itemOffers = catalog.items
            .filter((item) => item.pricing.discountCoin > 0)
            .map((item) => ({ key: `item:${item.id}`, label: item.name, detail: `${item.pricing.discountCoin} coin indirim` }));
        const bundleOffers = catalog.bundles
            .filter((bundle) => bundle.pricing.discountCoin > 0)
            .map((bundle) => ({ key: `bundle:${bundle.id}`, label: bundle.name, detail: `${bundle.pricing.discountCoin} coin indirim` }));
        return [...itemOffers, ...bundleOffers].slice(0, 4);
    }, [catalog.bundles, catalog.items]);

    const busyKey = busyTarget ? `${busyTarget.kind}:${busyTarget.id}` : null;
    const trimmedCouponCode = couponCode.trim().toUpperCase();

    const activeCouponItemMap = useMemo(
        () => new Map((activeCouponPreview?.items ?? []).map((entry) => [entry.targetId, entry])),
        [activeCouponPreview]
    );
    const activeCouponBundleMap = useMemo(
        () => new Map((activeCouponPreview?.bundles ?? []).map((entry) => [entry.targetId, entry])),
        [activeCouponPreview]
    );
    const couponMatchedItems = useMemo(
        () => catalog.items.filter((item) => activeCouponItemMap.has(item.id)),
        [activeCouponItemMap, catalog.items]
    );
    const couponMatchedBundles = useMemo(
        () => catalog.bundles.filter((bundle) => activeCouponBundleMap.has(bundle.id)),
        [activeCouponBundleMap, catalog.bundles]
    );

    const getDisplayedItemPricing = (item: CatalogStoreItemView) => {
        const couponMatch = activeCouponItemMap.get(item.id);
        if (couponMatch && activeCouponPreview?.coupon) {
            return {
                pricing: couponMatch.pricing,
                coupon: activeCouponPreview.coupon,
                couponApplied: true,
                referencePriceCoin: item.pricing.finalPriceCoin,
            };
        }

        return {
            pricing: item.pricing,
            coupon: null,
            couponApplied: false,
            referencePriceCoin: item.pricing.basePriceCoin,
        };
    };

    const getDisplayedBundlePricing = (bundle: CatalogBundleView) => {
        const couponMatch = activeCouponBundleMap.get(bundle.id);
        if (couponMatch && activeCouponPreview?.coupon) {
            return {
                pricing: couponMatch.pricing,
                coupon: activeCouponPreview.coupon,
                couponApplied: true,
                referencePriceCoin: bundle.pricing.finalPriceCoin,
            };
        }

        return {
            pricing: bundle.pricing,
            coupon: null,
            couponApplied: false,
            referencePriceCoin: bundle.pricing.basePriceCoin,
        };
    };

    const sortedItems = useMemo(() => {
        if (!activeCouponPreview) {
            return filteredItems;
        }

        return [...filteredItems].sort((left, right) => {
            const leftMatch = activeCouponItemMap.has(left.id) ? 0 : 1;
            const rightMatch = activeCouponItemMap.has(right.id) ? 0 : 1;
            if (leftMatch !== rightMatch) {
                return leftMatch - rightMatch;
            }
            return left.sortOrder - right.sortOrder;
        });
    }, [activeCouponItemMap, activeCouponPreview, filteredItems]);

    const applyOwnedItems = (awardedItemIds: number[], nextCoinBalance: number) => {
        const awardedSet = new Set(awardedItemIds);
        setCatalog((currentCatalog) => ({
            coinBalance: nextCoinBalance,
            items: currentCatalog.items.map((item) => (awardedSet.has(item.id) ? { ...item, owned: true } : item)),
            bundles: currentCatalog.bundles.map((bundle) => {
                const ownedItemCount = bundle.items.filter((entry) => awardedSet.has(entry.shopItemId)).length + bundle.ownedItemCount;
                return {
                    ...bundle,
                    ownedItemCount,
                    fullyOwned: ownedItemCount >= bundle.items.length && bundle.items.length > 0,
                };
            }),
            liveops: currentCatalog.liveops,
        }));
    };
    const handleBuyItem = async (item: CatalogStoreItemView) => {
        if (busyTarget || item.owned) {
            return;
        }
        setBusyTarget({ kind: "shop_item", id: item.id });
        try {
            const response = await fetch("/api/store/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shopItemId: item.id,
                    couponCode: trimmedCouponCode || undefined,
                }),
            });
            const payload = (await response.json()) as { coinBalance?: number; finalPriceCoin?: number; error?: string };
            if (!response.ok) {
                toast.error(payload.error || "Satın alma başarısız.");
                return;
            }

            applyOwnedItems([item.id], payload.coinBalance ?? catalog.coinBalance);
            if (payload.coinBalance !== undefined) {
                dispatchWalletUpdated({ coinBalance: payload.coinBalance, source: "store_purchase" });
            }
            dispatchNotificationsUpdated();
            toast.success(`${item.name} satın alındı.`, {
                description: payload.finalPriceCoin !== undefined ? `${payload.finalPriceCoin} coin harcandı.` : undefined,
            });
        } catch {
            toast.error("Satın alma isteği tamamlanamadı.");
        } finally {
            setBusyTarget(null);
        }
    };

    const handleBuyBundle = async (bundle: CatalogBundleView) => {
        if (busyTarget || bundle.fullyOwned) {
            return;
        }
        setBusyTarget({ kind: "bundle", id: bundle.id });
        try {
            const response = await fetch("/api/store/bundles/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bundleId: bundle.id,
                    couponCode: trimmedCouponCode || undefined,
                }),
            });
            const payload = (await response.json()) as { awardedItems?: Array<{ id: number }>; coinBalance?: number; finalPriceCoin?: number; error?: string };
            if (!response.ok) {
                toast.error(payload.error || "Paket satın alma başarısız.");
                return;
            }

            const awardedItemIds = payload.awardedItems?.map((entry) => entry.id) ?? [];
            applyOwnedItems(awardedItemIds, payload.coinBalance ?? catalog.coinBalance);
            if (payload.coinBalance !== undefined) {
                dispatchWalletUpdated({ coinBalance: payload.coinBalance, source: "bundle_purchase" });
            }
            dispatchNotificationsUpdated();
            toast.success(`${bundle.name} satın alındı.`, {
                description: payload.finalPriceCoin !== undefined ? `${payload.finalPriceCoin} coin harcandı.` : undefined,
            });
        } catch {
            toast.error("Paket satın alma isteği tamamlanamadı.");
        } finally {
            setBusyTarget(null);
        }
    };

    const handleApplyCoupon = async () => {
        if (!trimmedCouponCode || applyingCoupon) {
            toast.info("Kuponu kullanmak için önce kodu gir.");
            return;
        }
        setApplyingCoupon(true);
        try {
            const response = await fetch("/api/store/coupons/catalog-preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    couponCode: trimmedCouponCode,
                }),
            });
            const payload = (await response.json()) as CouponCatalogPreviewResponse | { error?: string };
            if (!response.ok || !("valid" in payload)) {
                setActiveCouponPreview(null);
                toast.error(("error" in payload && payload.error) ? payload.error : "Kupon doğrulanamadı.");
                return;
            }
            if (!payload.valid || !payload.coupon) {
                setActiveCouponPreview(null);
                toast.error(payload.reason || "Kupon bu hedef için geçerli değil.");
                return;
            }

            setActiveCouponPreview({
                valid: payload.valid,
                reason: payload.reason,
                coupon: payload.coupon,
                items: payload.items,
                bundles: payload.bundles,
            });
            toast.success(`${payload.coupon.code} uygulandı.`, {
                description: `${payload.items.length + payload.bundles.length} teklif güncellendi.`,
            });
        } catch {
            toast.error("Kupon doğrulama isteği tamamlanamadı.");
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleRedeemCoinGrant = async () => {
        const trimmedCode = coinGrantCode.trim();
        if (!trimmedCode || redeemingCoinGrant) {
            return;
        }
        setRedeemingCoinGrant(true);
        try {
            const response = await fetch("/api/coin-grants/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: trimmedCode }),
            });
            const payload = (await response.json()) as CoinGrantRedeemResult | { error?: string };
            if (!response.ok || !("ok" in payload) || !payload.ok) {
                toast.error(("error" in payload && payload.error) ? payload.error : "Coin kodu kullanılamadı.");
                return;
            }

            setCatalog((currentCatalog) => ({ ...currentCatalog, coinBalance: payload.coinBalance }));
            dispatchWalletUpdated({ coinBalance: payload.coinBalance, source: "coin_grant" });
            dispatchNotificationsUpdated();
            setCoinGrantCode("");
            toast.success("Coin kodu kullanıldı.", {
                description: `${payload.coinAmount} coin eklendi.`,
            });
        } catch {
            toast.error("Coin kodu isteği tamamlanamadı.");
        } finally {
            setRedeemingCoinGrant(false);
        }
    };

    const containerClassName = layout === "dashboard"
        ? "mx-auto flex w-full max-w-[1480px] flex-col px-4 py-5 md:px-6 md:py-6 xl:px-8"
        : "rounded-[28px] border border-zinc-200/70 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/70";

    return (
        <div className={containerClassName}>
            <section className="mb-5 overflow-hidden rounded-[26px] border border-[#d5dee7] bg-[linear-gradient(135deg,#fdfdfd_0%,#f8fafc_58%,#eef4ff_100%)] shadow-[0_18px_48px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_58%,#172554_100%)]">
                <div className="grid gap-4 p-4 md:p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:border-slate-700/70 dark:bg-slate-950/50 dark:text-slate-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            Mağaza
                        </div>
                        <h1 className="max-w-2xl text-xl font-black tracking-tight text-slate-950 dark:text-white md:text-[1.75rem]">
                            Kozmetik kataloğu
                        </h1>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Avatar, çerçeve ve kart kozmetiklerini kategoriye göre tarayabilir, satın almadan önce önizlemeyi açabilirsin.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <StatusChip label={`Mağaza x${catalog.liveops.storePriceMultiplier.toFixed(2)}`} />
                            <StatusChip label={`Maç x${catalog.liveops.activeMatchCoinMultiplier.toFixed(2)}`} />
                            {catalog.liveops.weekendBoostApplied ? <StatusChip label="Hafta Sonu Bonusu" tone="warning" /> : null}
                            {!catalog.liveops.discountCampaignsEnabled ? <StatusChip label="Kampanyalar Durduruldu" tone="danger" /> : null}
                        </div>
                        {discountedOffers.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {discountedOffers.map((offer) => (
                                    <div key={offer.key} className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-300">
                                        <BadgePercent className="h-3.5 w-3.5" />
                                        <span>{offer.label}</span>
                                        <span className="text-emerald-500">{offer.detail}</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    <div className="grid gap-3">
                        <CoinBadge value={catalog.coinBalance} label="Coin Bakiyesi" className="rounded-[24px] border-amber-300/70 bg-white/90 px-4 py-4 dark:bg-slate-950/55" valueClassName="text-2xl" />
                        <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/45">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    {utilityMode === "coupon" ? <TicketPercent className="h-3.5 w-3.5" /> : <Gift className="h-3.5 w-3.5" />}
                                    {utilityMode === "coupon" ? "Kupon" : "Coin Kodu"}
                                </div>
                                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/70">
                                    <button
                                        type="button"
                                        onClick={() => setUtilityMode("coupon")}
                                        className={cn(
                                            "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] transition",
                                            utilityMode === "coupon"
                                                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                                                : "text-slate-500 dark:text-slate-400"
                                        )}
                                    >
                                        Kupon
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUtilityMode("coin_grant")}
                                        className={cn(
                                            "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] transition",
                                            utilityMode === "coin_grant"
                                                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                                                : "text-slate-500 dark:text-slate-400"
                                        )}
                                    >
                                        Coin Kodu
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 space-y-3">
                                {utilityMode === "coupon" ? (
                                    <>
                                        <div className="flex gap-2">
                                            <input
                                                value={couponCode}
                                                onChange={(event) => {
                                                    const nextValue = event.target.value.toUpperCase();
                                                    setCouponCode(nextValue);
                                                    if (!nextValue.trim() || (activeCouponPreview && activeCouponPreview.coupon.code !== nextValue.trim())) {
                                                        setActiveCouponPreview(null);
                                                    }
                                                }}
                                                placeholder="WELCOME25"
                                                disabled={!catalog.liveops.couponsEnabled}
                                                className={cn(
                                                    "min-w-0 flex-1 rounded-2xl border bg-white px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 outline-none transition dark:bg-slate-950 dark:text-slate-100",
                                                    activeCouponPreview && activeCouponPreview.coupon.code === trimmedCouponCode
                                                        ? "border-emerald-300 focus:border-emerald-500 dark:border-emerald-800/60"
                                                        : "border-slate-200 focus:border-slate-500 dark:border-slate-700"
                                                )}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => void handleApplyCoupon()}
                                                disabled={!trimmedCouponCode || !catalog.liveops.couponsEnabled || applyingCoupon}
                                                className={cn(
                                                    "inline-flex min-w-[112px] items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold transition disabled:opacity-50",
                                                    applyingCoupon
                                                        ? "border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                                        : "",
                                                    activeCouponPreview && activeCouponPreview.coupon.code === trimmedCouponCode
                                                        ? "border border-emerald-300 bg-emerald-500 text-white shadow-[0_12px_28px_-18px_rgba(16,185,129,0.9)] hover:bg-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500 dark:text-white"
                                                        : "border border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
                                                )}
                                            >
                                                {applyingCoupon ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : activeCouponPreview && activeCouponPreview.coupon.code === trimmedCouponCode ? <Check className="h-3.5 w-3.5" /> : <TicketPercent className="h-3.5 w-3.5" />}
                                                {applyingCoupon ? "Kontrol Ediliyor" : activeCouponPreview && activeCouponPreview.coupon.code === trimmedCouponCode ? "Uygulandı" : "Kullan"}
                                            </button>
                                        </div>
                                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                                            Kupon geçerliyse indirimli ürün ve paketler üstte görünür. Kartların üzerinde yeni fiyatı hemen görürsün.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            {activeCouponPreview ? (
                                                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-bold text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                                                    Aktif kupon: {activeCouponPreview.coupon.code} • {activeCouponPreview.items.length + activeCouponPreview.bundles.length} teklif
                                                </span>
                                            ) : null}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex gap-2">
                                            <input
                                                value={coinGrantCode}
                                                onChange={(event) => setCoinGrantCode(event.target.value.toUpperCase())}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        void handleRedeemCoinGrant();
                                                    }
                                                }}
                                                placeholder="CREATOR-AB12CD"
                                                maxLength={80}
                                                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 outline-none transition focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => void handleRedeemCoinGrant()}
                                                disabled={redeemingCoinGrant || !coinGrantCode.trim()}
                                                className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                                            >
                                                {redeemingCoinGrant ? "..." : "Kullan"}
                                            </button>
                                        </div>
                                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                                            Etkinlik veya içerik üreticisi kodlarını burada kullan. Başarılı olduğunda coin bakiyen ve bildirimlerin güncellenir.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="mb-5 flex flex-wrap gap-2">
                {categories.map((shopCategory) => {
                    const Icon = shopCategory.icon;
                    const active = category === shopCategory.id;
                    return (
                        <button key={shopCategory.id} type="button" onClick={() => setCategory(shopCategory.id)} className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-all", active ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-slate-900")}><Icon className="h-3.5 w-3.5" />{shopCategory.label}</button>
                    );
                })}
            </div>

            {activeCouponPreview && (couponMatchedItems.length > 0 || couponMatchedBundles.length > 0) ? (
                <section className="mb-8 rounded-[24px] border border-blue-200/80 bg-blue-50/70 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
                                Aktif Kupon
                            </div>
                            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{activeCouponPreview.coupon.code}</h2>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                İndirimli ürün ve paketler aşağıda işaretlendi. Yeni fiyatlar kartların üzerinde doğrudan görünüyor.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                            <span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-blue-700 dark:border-blue-800/60 dark:bg-slate-950/50 dark:text-blue-300">
                                {couponMatchedItems.length} ürün
                            </span>
                            <span className="rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-blue-700 dark:border-blue-800/60 dark:bg-slate-950/50 dark:text-blue-300">
                                {couponMatchedBundles.length} paket
                            </span>
                        </div>
                    </div>
                </section>
            ) : null}

            {featuredItems.length > 0 ? (
                <section className="mb-8">
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Öne Çıkanlar</h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Vitrine alınan ürünler burada öne çıkarılır.</p>
                        </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                        {featuredItems.map((item) => (
                            <FeatureCard key={item.id} item={item} activePricing={getDisplayedItemPricing(item)} busy={busyKey === `shop_item:${item.id}`} onPreview={() => setPreviewOffer({ kind: "item", item })} onBuy={() => void handleBuyItem(item)} />
                        ))}
                    </div>
                </section>
            ) : null}

            <section className="mb-8 rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800/70 dark:bg-slate-950/40 md:p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Ürünler</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Seçili kategoriye göre filtrelenmiş mağaza kataloğu.</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">{filteredItems.length} Ürün</div>
                </div>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Ürün, paket veya etiket ara"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
                        />
                    </div>
                    {searchQuery ? (
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Arama: {searchTerm}
                        </div>
                    ) : null}
                </div>
                {filteredItems.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-300/70 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700/70 dark:text-slate-400">{searchQuery ? "Aramaya uygun ürün bulunamadı." : "Bu kategoride aktif ürün yok."}</div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
                        {sortedItems.map((item) => (
                            <MerchItemCard key={item.id} item={item} activePricing={getDisplayedItemPricing(item)} busy={busyKey === `shop_item:${item.id}`} onPreview={() => setPreviewOffer({ kind: "item", item })} onBuy={() => void handleBuyItem(item)} />
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800/70 dark:bg-slate-950/40 md:p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Paketler</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Birden fazla kozmetiği tek alımda toplayan teklif setleri.</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">{filteredBundles.length} Paket</div>
                </div>
                {filteredBundles.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-300/70 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700/70 dark:text-slate-400">{catalog.liveops.bundlesEnabled ? (searchQuery ? "Aramaya uygun paket bulunamadı." : "Aktif paket yok.") : "Paket satışları geçici olarak kapalı."}</div>
                ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {filteredBundles.map((bundle) => (
                            <BundleMerchCard key={bundle.id} bundle={bundle} activePricing={getDisplayedBundlePricing(bundle)} itemLookup={catalogItemMap} busy={busyKey === `bundle:${bundle.id}`} onPreview={() => setPreviewOffer({ kind: "bundle", bundle })} onBuy={() => void handleBuyBundle(bundle)} />
                        ))}
                    </div>
                )}
            </section>

            {previewOffer ? <PreviewModal offer={previewOffer} itemLookup={catalogItemMap} getDisplayedItemPricing={getDisplayedItemPricing} getDisplayedBundlePricing={getDisplayedBundlePricing} onClose={() => setPreviewOffer(null)} onBuyItem={handleBuyItem} onBuyBundle={handleBuyBundle} busyKey={busyKey} /> : null}
        </div>
    );
}

function StatusChip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warning" | "danger" }) {
    return <div className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]", tone === "warning" && "border-amber-300/80 bg-amber-50/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300", tone === "danger" && "border-rose-300/80 bg-rose-50/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300", tone === "neutral" && "border-slate-200/80 bg-white/80 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/40 dark:text-slate-300")}>{label}</div>;
}

function FeatureCard({ item, activePricing, busy, onPreview, onBuy }: { item: CatalogStoreItemView; activePricing: DisplayedPricing; busy: boolean; onPreview: () => void; onBuy: () => void }) {
    return (
        <article className={cn("group relative overflow-hidden rounded-[30px] border p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)] transition-all hover:-translate-y-1 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,0.32)]", SHOP_RARITY_CARD_CLASS[item.rarity], SHOP_RARITY_HALO_CLASS[item.rarity])}>
            <div className={cn("absolute inset-x-5 top-0 h-1.5 rounded-b-full opacity-90", SHOP_RARITY_TOP_STRIP_CLASS[item.rarity])} />
            <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/60 bg-white/75 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-700 dark:border-slate-700/70 dark:bg-slate-950/60 dark:text-slate-200">
                                {item.isFeatured ? "Vitrin" : formatItemTypeLabel(item.type)}
                            </span>
                            {item.badgeText ? <span className="rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-300">{item.badgeText}</span> : null}
                        </div>
                        <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900 dark:text-white">{item.name}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatItemTypeLabel(item.type)} koleksiyonu</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${SHOP_RARITY_BADGE_CLASS[item.rarity]}`}>{item.rarity}</span>
                </div>

                <div className="mt-5 flex items-center justify-center rounded-[24px] border border-white/60 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(241,245,249,0.78))] p-5 dark:border-slate-700/60 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_58%),linear-gradient(180deg,rgba(30,41,59,0.72),rgba(15,23,42,0.82))]">
                    <StoreMiniPreview item={item} />
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Fiyat</div>
                        {(activePricing.couponApplied || activePricing.pricing.discountCoin > 0) ? <div className="mt-1 text-xs text-slate-400 line-through">{activePricing.referencePriceCoin.toLocaleString()} coin</div> : null}
                        <div className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
                            {activePricing.pricing.finalPriceCoin.toLocaleString()}
                            <CoinMark className="h-7 w-7" iconClassName="h-3.5 w-3.5" />
                        </div>
                        {activePricing.couponApplied ? <div className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">{activePricing.coupon?.code}</div> : null}
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    <ActionButton icon={<Eye className="h-3.5 w-3.5" />} label="Önizle" onClick={onPreview} />
                    <BuyButton item={item} busy={busy} onClick={onBuy} />
                </div>
            </div>
        </article>
    );
}
function MerchItemCard({ item, activePricing, busy, onPreview, onBuy }: { item: CatalogStoreItemView; activePricing: DisplayedPricing; busy: boolean; onPreview: () => void; onBuy: () => void }) {
    return (
        <article className={cn("group relative overflow-hidden rounded-[26px] border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-34px_rgba(15,23,42,0.25)]", SHOP_RARITY_CARD_CLASS[item.rarity], SHOP_RARITY_HALO_CLASS[item.rarity])}>
            <div className={cn("absolute inset-x-4 top-0 h-1.5 rounded-b-full opacity-85", SHOP_RARITY_TOP_STRIP_CLASS[item.rarity])} />
            <div className="relative z-10">
                <div className="mb-3 flex aspect-[0.95/1] items-center justify-center rounded-[20px] border border-white/40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.48),_transparent_55%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(226,232,240,0.85))] p-4 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.92))]">
                    <StoreMiniPreview item={item} />
                </div>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{formatItemTypeLabel(item.type)}</p>
                            {item.badgeText ? <span className="rounded-full border border-amber-200/80 bg-amber-50/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-300">{item.badgeText}</span> : null}
                        </div>
                        <h3 className="mt-2 truncate text-sm font-black text-slate-900 dark:text-white">{item.name}</h3>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SHOP_RARITY_BADGE_CLASS[item.rarity]}`}>{item.rarity}</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                        {(activePricing.couponApplied || activePricing.pricing.discountCoin > 0) ? <div className="text-[11px] text-slate-400 line-through">{activePricing.referencePriceCoin.toLocaleString()}</div> : null}
                        <div className="mt-0.5 flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                            {activePricing.pricing.finalPriceCoin.toLocaleString()}
                            <CoinMark className="h-4 w-4 ring-0 shadow-none" iconClassName="h-2.5 w-2.5" />
                        </div>
                        {activePricing.couponApplied ? <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">{activePricing.coupon?.code}</div> : null}
                    </div>
                    <ActionIconButton icon={<Eye className="h-3.5 w-3.5" />} label="Önizle" onClick={onPreview} />
                </div>
                <div className="mt-3"><BuyButton item={item} busy={busy} onClick={onBuy} fullWidth /></div>
            </div>
        </article>
    );
}

function BundleMerchCard({ bundle, activePricing, itemLookup, busy, onPreview, onBuy }: { bundle: CatalogBundleView; activePricing: DisplayedPricing; itemLookup: Map<number, CatalogStoreItemView>; busy: boolean; onPreview: () => void; onBuy: () => void }) {
    const disabled = busy || bundle.fullyOwned || bundle.ownedItemCount > 0;
    return (
        <article className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.9),rgba(240,249,255,0.88))] p-5 shadow-[0_24px_56px_-40px_rgba(15,23,42,0.24)] dark:border-slate-800/70 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(17,24,39,0.82),rgba(30,41,59,0.78))]">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white dark:bg-slate-100 dark:text-slate-950">Paket</div>
                        <div className="rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/60 dark:text-slate-300">{bundle.items.length} parça</div>
                        {activePricing.couponApplied ? <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">{activePricing.coupon?.code}</div> : null}
                    </div>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{bundle.name}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{bundle.description}</p>
                </div>
                <CoinBadge value={activePricing.pricing.finalPriceCoin} label="Paket Fiyatı" className="min-w-[140px] rounded-[20px] px-3 py-2" valueClassName="text-base" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {bundle.items.slice(0, 4).map((item) => {
                    const catalogItem = itemLookup.get(item.shopItemId);
                    return (
                        <div key={item.id} className={`rounded-[22px] border p-3 shadow-sm ${SHOP_RARITY_CARD_CLASS[item.itemRarity]}`}>
                            <div className="flex justify-center">
                                {catalogItem ? <StoreMiniPreview item={catalogItem} /> : <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-slate-900 text-sm font-black text-white">{item.itemName.slice(0, 1).toUpperCase()}</div>}
                            </div>
                            <div className="mt-3 text-center">
                                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{formatItemTypeLabel(item.itemType)}</div>
                                <div className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{item.itemName}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    {(activePricing.couponApplied || activePricing.pricing.discountCoin > 0) ? <div className="text-sm text-slate-400 line-through">{activePricing.referencePriceCoin.toLocaleString()} coin</div> : null}
                    <div className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{bundle.ownedItemCount > 0 ? `${bundle.ownedItemCount} ürüne zaten sahipsin` : `${bundle.items.length} kozmetik dahil`}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ActionButton icon={<Eye className="h-3.5 w-3.5" />} label="Önizle" onClick={onPreview} />
                    <button type="button" onClick={onBuy} disabled={disabled} className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">{bundle.fullyOwned ? "Sahipsin" : bundle.ownedItemCount > 0 ? "Sahip Olduğun Ürün Var" : busy ? "Alınıyor..." : "Paketi Satın Al"}</button>
                </div>
            </div>
        </article>
    );
}

function ActionButton({ icon, label, onClick, disabled = false }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
    return <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-900">{icon}{label}</button>;
}

function ActionIconButton({ icon, label, onClick, disabled = false }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
    return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-900">{icon}</button>;
}

function BuyButton({ item, busy, onClick, fullWidth = false }: { item: CatalogStoreItemView; busy: boolean; onClick: () => void; fullWidth?: boolean }) {
    const label = item.equipped ? "Kullanılıyor" : item.owned ? "Sahipsin" : busy ? "Alınıyor..." : "Satın Al";
    const className = item.owned ? (item.equipped ? "bg-blue-600 text-white" : "bg-emerald-600 text-white") : SHOP_RARITY_BUY_BUTTON_CLASS[item.rarity];
    return <button type="button" onClick={onClick} disabled={busy || item.owned} className={cn("rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all disabled:opacity-50", fullWidth && "w-full", className)}>{label}</button>;
}
function PreviewModal({ offer, itemLookup, getDisplayedItemPricing, getDisplayedBundlePricing, onClose, onBuyItem, onBuyBundle, busyKey }: { offer: PreviewOffer; itemLookup: Map<number, CatalogStoreItemView>; getDisplayedItemPricing: (item: CatalogStoreItemView) => DisplayedPricing; getDisplayedBundlePricing: (bundle: CatalogBundleView) => DisplayedPricing; onClose: () => void; onBuyItem: (item: CatalogStoreItemView) => void; onBuyBundle: (bundle: CatalogBundleView) => void; busyKey: string | null }) {
    if (!offer) return null;
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,251,0.98),rgba(238,244,255,0.98))] p-5 shadow-[0_32px_90px_-50px_rgba(15,23,42,0.8)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.96),rgba(23,37,84,0.95))] md:p-6" onClick={(event) => event.stopPropagation()}>
                <button type="button" onClick={onClose} className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900"><X className="h-4 w-4" /></button>
                {offer.kind === "item" ? <ItemPreviewContent item={offer.item} activePricing={getDisplayedItemPricing(offer.item)} busy={busyKey === `shop_item:${offer.item.id}`} onBuy={() => void onBuyItem(offer.item)} /> : <BundlePreviewContent bundle={offer.bundle} activePricing={getDisplayedBundlePricing(offer.bundle)} itemLookup={itemLookup} busy={busyKey === `bundle:${offer.bundle.id}`} onBuy={() => void onBuyBundle(offer.bundle)} />}
            </div>
        </div>
    );
}

function ItemPreviewContent({ item, activePricing, busy, onBuy }: { item: CatalogStoreItemView; activePricing: DisplayedPricing; busy: boolean; onBuy: () => void }) {
    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent_60%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(226,232,240,0.9))] p-5 dark:border-slate-800/70 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%),linear-gradient(180deg,rgba(17,24,39,0.96),rgba(2,6,23,0.96))]"><StoreLargePreview item={item} /></div>
            <div className="flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800/70 dark:bg-slate-950/45">
                <div className="flex items-start justify-between gap-4"><div><div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Ürün Önizleme</div><h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{item.name}</h3><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{formatItemTypeLabel(item.type)} • {item.rarity}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${SHOP_RARITY_BADGE_CLASS[item.rarity]}`}>{item.rarity}</span></div>
                {item.pricing.appliedPromotion ? <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">Kampanya: {item.pricing.appliedPromotion.name}</div> : null}
                <div className="mt-6"><div className="text-sm text-slate-400 dark:text-slate-500">Fiyat</div>{(activePricing.couponApplied || activePricing.pricing.discountCoin > 0) ? <div className="mt-1 text-sm text-slate-400 line-through">{activePricing.referencePriceCoin.toLocaleString()} coin</div> : null}<div className="mt-2 flex items-center gap-2 text-3xl font-black text-slate-900 dark:text-white">{activePricing.pricing.finalPriceCoin.toLocaleString()}<CoinMark className="h-9 w-9" iconClassName="h-4 w-4" /></div>{activePricing.couponApplied ? <div className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">{activePricing.coupon?.code}</div> : null}</div>
                <div className="mt-auto flex flex-wrap gap-2 pt-6"><BuyButton item={item} busy={busy} onClick={onBuy} /></div>
            </div>
        </div>
    );
}

function BundlePreviewContent({ bundle, activePricing, itemLookup, busy, onBuy }: { bundle: CatalogBundleView; activePricing: DisplayedPricing; itemLookup: Map<number, CatalogStoreItemView>; busy: boolean; onBuy: () => void }) {
    const disabled = busy || bundle.fullyOwned || bundle.ownedItemCount > 0;
    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent_60%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(226,232,240,0.9))] p-5 dark:border-slate-800/70 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%),linear-gradient(180deg,rgba(17,24,39,0.96),rgba(2,6,23,0.96))]">
                <div className="grid grid-cols-2 gap-4">{bundle.items.map((item) => { const catalogItem = itemLookup.get(item.shopItemId); return (<div key={item.id} className={`rounded-[22px] border p-4 text-center ${SHOP_RARITY_CARD_CLASS[item.itemRarity]}`}><div className="flex justify-center">{catalogItem ? <StoreMiniPreview item={catalogItem} /> : <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-slate-900 text-sm font-black text-white">{item.itemName.slice(0, 1).toUpperCase()}</div>}</div><div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{formatItemTypeLabel(item.itemType)}</div><div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{item.itemName}</div></div>); })}</div>
            </div>
            <div className="flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800/70 dark:bg-slate-950/45">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Paket Önizleme</div><h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{bundle.name}</h3><p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{bundle.description}</p>
                <div className="mt-6"><div className="text-sm text-slate-400 dark:text-slate-500">Fiyat</div>{(activePricing.couponApplied || activePricing.pricing.discountCoin > 0) ? <div className="mt-1 text-sm text-slate-400 line-through">{activePricing.referencePriceCoin.toLocaleString()} coin</div> : null}<div className="mt-2 flex items-center gap-2 text-3xl font-black text-slate-900 dark:text-white">{activePricing.pricing.finalPriceCoin.toLocaleString()}<CoinMark className="h-9 w-9" iconClassName="h-4 w-4" /></div>{activePricing.couponApplied ? <div className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">{activePricing.coupon?.code}</div> : null}<div className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{bundle.ownedItemCount > 0 ? `${bundle.ownedItemCount} ürüne zaten sahipsin` : `${bundle.items.length} kozmetik dahil`}</div></div>
                <div className="mt-auto flex flex-wrap gap-2 pt-6"><button type="button" onClick={onBuy} disabled={disabled} className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">{bundle.fullyOwned ? "Sahipsin" : bundle.ownedItemCount > 0 ? "Sahip Olduğun Ürün Var" : busy ? "Alınıyor..." : "Paketi Satın Al"}</button></div>
            </div>
        </div>
    );
}

function StoreMiniPreview({ item }: { item: CatalogStoreItemView }) {
    if (item.type === "avatar") {
        return <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] border border-white/50 bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-[0_18px_38px_-24px_rgba(59,130,246,0.58)] dark:border-white/10">{item.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={item.imageUrl} alt={item.name} width={80} height={80} className="h-full w-full object-cover" /> : <span className="text-2xl font-black text-white">{getItemInitial(item.name)}</span>}</div>;
    }
    if (item.type === "frame") {
        const theme = resolveFrameTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
        if (!theme) {
            return <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-slate-900 text-2xl font-black text-white">{getItemInitial(item.name)}</div>;
        }
        const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.accentColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
        return <div className="relative h-20 w-20"><div className="absolute inset-0 rounded-[24px]" style={{ border: `${theme.thickness}px solid ${theme.accentColor}`, boxShadow: `0 0 ${theme.glowBlur}px ${applyHexAlpha(theme.glowColor, theme.glowOpacity)}` }} />{theme.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={theme.imageUrl} alt={item.name} fill className="rounded-[24px] object-cover opacity-85" /> : null}<div className={cn("absolute inset-0 rounded-[24px]", getCosmeticMotionClass(theme.motionPreset))} style={{ ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[12px] flex items-center justify-center rounded-[16px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-xl font-black text-white shadow-lg">{getItemInitial(item.name)}</div></div>;
    }
    return <div className={cn("relative h-24 w-[74px] overflow-hidden rounded-[18px] shadow-[0_18px_40px_-28px_rgba(15,23,42,0.5)]", item.type === "card_back" ? "bg-slate-900" : "bg-white")}><StoreCardPreviewSurface item={item} compact /></div>;
}

function StoreLargePreview({ item }: { item: CatalogStoreItemView }) {
    if (item.type === "avatar") {
        return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="space-y-5 text-center"><div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-[36px] border border-white/20 bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-[0_24px_60px_-34px_rgba(59,130,246,0.65)]">{item.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={item.imageUrl} alt={item.name} width={144} height={144} className="h-full w-full object-cover" /> : <span className="text-5xl font-black text-white">{getItemInitial(item.name)}</span>}</div><div><div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Oyuncu Kutusu</div><div className="mt-2 text-lg font-black text-slate-900 dark:text-white">{item.name}</div></div></div></div>;
    }
    if (item.type === "frame") {
        const theme = resolveFrameTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
        if (!theme) {
            return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="flex h-56 w-56 items-center justify-center rounded-[44px] bg-slate-900 text-5xl font-black text-white">{getItemInitial(item.name)}</div></div>;
        }
        const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.accentColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
        return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="relative flex h-56 w-56 items-center justify-center"><div className="absolute inset-0 rounded-[44px]" style={{ border: `${theme.thickness}px solid ${theme.accentColor}`, boxShadow: `0 0 ${theme.glowBlur}px ${applyHexAlpha(theme.glowColor, theme.glowOpacity)}` }} />{theme.frameStyle !== "solid" ? <div className="absolute inset-[14px] rounded-[34px] border" style={{ borderColor: theme.secondaryColor, opacity: theme.frameStyle === "double" ? 0.8 : 0.6 }} /> : null}{theme.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={theme.imageUrl} alt={item.name} fill className="rounded-[44px] object-cover opacity-85" /> : null}<div className={cn("absolute inset-0 rounded-[44px]", getCosmeticMotionClass(theme.motionPreset))} style={{ ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[34px] rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" /><div className="absolute inset-[58px] flex items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 text-4xl font-black text-white shadow-lg">{getItemInitial(item.name)}</div></div></div>;
    }
    return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="relative h-[272px] w-[198px] overflow-hidden rounded-[30px] border border-white/30 bg-slate-950 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.65)]"><StoreCardPreviewSurface item={item} /></div></div>;
}

function StoreCardPreviewSurface({ item, compact = false }: { item: CatalogStoreItemView; compact?: boolean }) {
    if (item.type === "card_back") {
        const theme = resolveCardBackTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
        const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.borderColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
        return <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.98))]">{theme.overlayImageUrl ? <Image loader={passthroughImageLoader} unoptimized src={theme.overlayImageUrl} alt={item.name} fill className="object-cover opacity-90" /> : null}<div className={cn("absolute inset-0", getCosmeticMotionClass(theme.motionPreset))} style={{ ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[10%] rounded-[22px] border-2" style={{ borderColor: theme.borderColor }} /><div className="absolute inset-[20%] rounded-[16px] border" style={{ borderColor: theme.secondaryColor }} />{!compact ? <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-sm">Kart Arkası</div> : null}</div>;
    }
    const theme = resolveCardFaceTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
    const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.borderColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
    const overlayStyle = theme.overlayImageUrl ? { backgroundImage: `linear-gradient(rgba(255,255,255,${theme.overlayOpacity * 0.7}), rgba(255,255,255,${theme.overlayOpacity * 0.7})), url(${theme.overlayImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
    return <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-900"><div className="absolute inset-0" style={overlayStyle} /><div className={cn("absolute inset-[10px] rounded-[20px] border-2", getCosmeticMotionClass(theme.motionPreset))} style={{ borderColor: theme.borderColor, ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[18px] rounded-[16px] border bg-white/70 backdrop-blur-[1px]" style={{ borderColor: theme.secondaryColor }} />{compact ? <><div className="absolute inset-x-[24px] top-[18px] h-3 rounded-full bg-slate-900/15" /><div className="absolute inset-x-[28px] bottom-[18px] h-3 rounded-full bg-slate-900/12" /></> : <><div className="absolute inset-x-[20px] top-[22px] rounded-full bg-slate-900/85 px-3 py-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white">Tema</div><div className="absolute inset-x-6 top-[42%] -translate-y-1/2 text-center"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Kart Önü</div><div className="mt-2 text-lg font-black">{item.name}</div></div><div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 backdrop-blur-sm"><Sparkles className="h-3 w-3" />Oyun İçi</div></>}</div>;
}
