"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { useSession } from "next-auth/react";
import {
    BadgePercent,
    Frame,
    Gem,
    Gift,
    ShoppingBag,
    TicketPercent,
    UserCircle,
} from "lucide-react";
import { CoinBadge, CoinMark } from "@/components/ui/coin-badge";
import {
    SHOP_RARITY_BADGE_CLASS,
    SHOP_RARITY_BUY_BUTTON_CLASS,
    SHOP_RARITY_CARD_CLASS,
    SHOP_RARITY_HALO_CLASS,
    SHOP_RARITY_TOP_STRIP_CLASS,
} from "@/lib/store/shop-admin";
import type {
    CatalogBundleView,
    CatalogStoreItemView,
    CouponPreviewResponse,
    StoreCatalogResponse,
    StoreItemType,
} from "@/types/economy";
import type { CoinGrantRedeemResult } from "@/types/coin-grants";
import { dispatchWalletUpdated } from "@/lib/wallet-events";

type ShopCategory = "all" | StoreItemType;
type BusyTarget = { kind: "shop_item" | "bundle"; id: number } | null;
type LayoutMode = "dashboard" | "page";
type FeedbackTone = "success" | "error";

interface ShopContentProps {
    layout?: LayoutMode;
}

const categories: { id: ShopCategory; icon: typeof ShoppingBag; label: string }[] = [
    { id: "all", icon: ShoppingBag, label: "Tüm Ürünler" },
    { id: "avatar", icon: UserCircle, label: "Avatarlar" },
    { id: "frame", icon: Frame, label: "Çerçeveler" },
    { id: "card_back", icon: ShoppingBag, label: "Kart Arkaları" },
    { id: "card_face", icon: ShoppingBag, label: "Kart Önleri" },
];

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

function getItemInitial(name: string): string {
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

function targetKey(target: BusyTarget): string | null {
    return target ? `${target.kind}:${target.id}` : null;
}

function formatItemTypeLabel(type: StoreItemType): string {
    if (type === "avatar") {
        return "Avatar";
    }
    if (type === "frame") {
        return "Çerçeve";
    }
    if (type === "card_back") {
        return "Kart Arkası";
    }
    return "Kart Önü";
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
                // Keep current state when the catalog request fails.
            }
        };

        void load();
    }, [session]);

    const filteredItems = useMemo(() => {
        if (category === "all") {
            return catalog.items;
        }

        return catalog.items.filter((item) => item.type === category);
    }, [catalog.items, category]);

    const activeOffers = useMemo(() => {
        const itemOffers = catalog.items
            .filter((item) => item.pricing.discountCoin > 0)
            .map((item) => ({
                key: `item:${item.id}`,
                title: item.name,
                detail: `${item.pricing.discountCoin} coin indirim`,
            }));
        const bundleOffers = catalog.bundles
            .filter((bundle) => bundle.pricing.discountCoin > 0)
            .map((bundle) => ({
                key: `bundle:${bundle.id}`,
                title: bundle.name,
                detail: `${bundle.pricing.discountCoin} coin indirim`,
            }));

        return [...itemOffers, ...bundleOffers].slice(0, 4);
    }, [catalog.bundles, catalog.items]);

    const busyKey = targetKey(busyTarget);

    const applyOwnedItems = (awardedItemIds: number[], nextCoinBalance: number) => {
        const awardedSet = new Set(awardedItemIds);

        setCatalog((currentCatalog) => ({
            coinBalance: nextCoinBalance,
            items: currentCatalog.items.map((item) =>
                awardedSet.has(item.id) ? { ...item, owned: true } : item
            ),
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
                    couponCode: couponCode.trim() || undefined,
                }),
            });

            const payload = (await response.json()) as {
                coinBalance?: number;
                finalPriceCoin?: number;
                error?: string;
            };

            if (!response.ok) {
                setCouponFeedback(payload.error || "Satın alma başarısız.");
                return;
            }

            applyOwnedItems([item.id], payload.coinBalance ?? catalog.coinBalance);
            if (payload.coinBalance !== undefined) {
                dispatchWalletUpdated({
                    coinBalance: payload.coinBalance,
                    source: "store_purchase",
                });
            }
            setCouponFeedback(payload.finalPriceCoin !== undefined ? `Satın alındı: ${payload.finalPriceCoin} coin` : null);
        } catch {
            setCouponFeedback("Satın alma isteği tamamlanamadı.");
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
                    couponCode: couponCode.trim() || undefined,
                }),
            });

            const payload = (await response.json()) as {
                awardedItems?: Array<{ id: number }>;
                coinBalance?: number;
                finalPriceCoin?: number;
                error?: string;
            };

            if (!response.ok) {
                setCouponFeedback(payload.error || "Paket satın alma başarısız.");
                return;
            }

            const awardedItemIds = payload.awardedItems?.map((entry) => entry.id) ?? [];
            applyOwnedItems(awardedItemIds, payload.coinBalance ?? catalog.coinBalance);
            if (payload.coinBalance !== undefined) {
                dispatchWalletUpdated({
                    coinBalance: payload.coinBalance,
                    source: "bundle_purchase",
                });
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
            setCouponFeedback("Kupon kodunu girip bir hedef seç.");
            return;
        }

        setBusyTarget(target);
        try {
            const response = await fetch("/api/store/coupons/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetKind: target.kind,
                    targetId: target.id,
                    couponCode: trimmedCouponCode,
                }),
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

            setCouponFeedback(
                `${payload.coupon.code} uygulanir: ${payload.pricing.finalPriceCoin} coin`
            );
        } catch {
            setCouponFeedback("Kupon doğrulama isteği tamamlanamadı.");
        } finally {
            setBusyTarget(null);
        }
    };

    const handleRedeemCoinGrant = async () => {
        const trimmedCode = coinGrantCode.trim();
        if (!trimmedCode || redeemingCoinGrant) {
            return;
        }

        setRedeemingCoinGrant(true);
        setCoinGrantFeedback(null);
        try {
            const response = await fetch("/api/coin-grants/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: trimmedCode }),
            });

            const payload = (await response.json()) as CoinGrantRedeemResult | { error?: string };
            if (!response.ok || !("ok" in payload)) {
                setCoinGrantFeedbackTone("error");
                setCoinGrantFeedback(("error" in payload && payload.error) ? payload.error : "Coin kodu kullanılamadı.");
                return;
            }

            if (!payload.ok) {
                setCoinGrantFeedbackTone("error");
                setCoinGrantFeedback("Coin kodu kullanılamadı.");
                return;
            }

            setCatalog((currentCatalog) => ({
                ...currentCatalog,
                coinBalance: payload.coinBalance,
            }));
            dispatchWalletUpdated({
                coinBalance: payload.coinBalance,
                source: "coin_grant",
            });
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
            <header className="mb-8 flex shrink-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                        Mağaza
                        <span className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                            Canlı Fiyat
                        </span>
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Kozmetik ürünleri incele, kampanyaları gör ve satın almadan önce kuponunu dene.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {(["common", "rare", "epic", "legendary"] as const).map((rarity) => (
                            <div
                                key={rarity}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${SHOP_RARITY_CARD_CLASS[rarity]}`}
                            >
                                <Gem size={12} />
                                {rarity}
                            </div>
                        ))}
                    </div>
                    {activeOffers.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {activeOffers.map((offer) => (
                                <div
                                    key={offer.key}
                                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                                >
                                    <BadgePercent size={12} />
                                    <span>{offer.title}</span>
                                    <span className="text-emerald-500">{offer.detail}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
                        Mağaza x{catalog.liveops.storePriceMultiplier.toFixed(2)}
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
                        Maç x{catalog.liveops.activeMatchCoinMultiplier.toFixed(2)}
                        </div>
                        {catalog.liveops.weekendBoostApplied ? (
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                            Hafta sonu desteği açık
                            </div>
                        ) : null}
                        {!catalog.liveops.discountCampaignsEnabled ? (
                            <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/80 bg-rose-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                            Kampanyalar duraklatıldı
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <CoinBadge value={catalog.coinBalance} label="Coin Bakiyesi" />
                    <div className="grid min-w-[280px] gap-3 lg:min-w-[520px] lg:grid-cols-2">
                        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                <TicketPercent size={12} />
                                Kupon
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={couponCode}
                                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                                    placeholder="WELCOME25"
                                    disabled={!catalog.liveops.couponsEnabled}
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => setCouponFeedback("Kuponu seçili satın alma üzerinde önizleyebilirsin.")}
                                    disabled={!catalog.liveops.couponsEnabled}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Kullan
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {catalog.liveops.couponsEnabled
                                    ? "Kod, sonraki satın alma isteğine eklenir. Geçerlilik sunucu tarafında doğrulanır."
                                    : "Kupon kullanımı şu anda liveops tarafında geçici olarak kapalı."}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                <Gift size={12} />
                                Coin Kodu
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={coinGrantCode}
                                    onChange={(event) => {
                                        setCoinGrantCode(event.target.value.toUpperCase());
                                        if (coinGrantFeedback) {
                                            setCoinGrantFeedback(null);
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void handleRedeemCoinGrant();
                                        }
                                    }}
                                    placeholder="CREATOR-AB12CD"
                                    maxLength={80}
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 outline-none transition focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => void handleRedeemCoinGrant()}
                                    disabled={redeemingCoinGrant || !coinGrantCode.trim()}
                                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                                >
                                    {redeemingCoinGrant ? "..." : "Kullan"}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Etkinlik veya içerik üreticisi kodunu burada kullan. Onaylanırsa coin bakiyen hemen güncellenir.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {couponFeedback && (
                <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-200">
                    {couponFeedback}
                </div>
            )}
            {coinGrantFeedback && (
                <div
                    className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${
                        coinGrantFeedbackTone === "success"
                            ? "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                            : "border-rose-200/70 bg-rose-50/80 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
                    }`}
                >
                    {coinGrantFeedback}
                </div>
            )}

            <div className="grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)]">
                <div className="flex w-full shrink-0 flex-row gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
                    {categories.map((shopCategory) => {
                        const Icon = shopCategory.icon;
                        const active = category === shopCategory.id;
                        return (
                            <button
                                key={shopCategory.id}
                                onClick={() => setCategory(shopCategory.id)}
                                className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-all ${active
                                    ? "bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/30"
                                    : "text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
                                    }`}
                                type="button"
                            >
                                <Icon size={18} />
                                {shopCategory.label}
                            </button>
                        );
                    })}
                </div>

                <div className="min-w-0 space-y-10 pb-4">
                    <section>
                        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Ürünler
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    {filteredItems.length}
                                </span>
                            </h3>
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {filteredItems.length} Ürün
                            </div>
                        </div>

                        {filteredItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/30 p-10 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400">
                                Bu kategoride aktif ürün yok. Yeni ürünler eklendiğinde burada görünür.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                                {filteredItems.map((item) => (
                                    <ShopItemCard
                                        key={item.id}
                                        item={item}
                                        onBuy={handleBuyItem}
                                        onPreviewCoupon={() => void handlePreviewCoupon({ kind: "shop_item", id: item.id })}
                                        busy={busyKey === `shop_item:${item.id}`}
                                        couponReady={catalog.liveops.couponsEnabled && couponCode.trim().length > 0}
                                        itemInitial={getItemInitial(item.name)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Öne Çıkan Paketler
                            </h3>
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {catalog.bundles.length} Paket
                            </div>
                        </div>
                        {catalog.bundles.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/30 p-10 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400">
                                {catalog.liveops.bundlesEnabled ? "Aktif paket yok." : "Paket satışları geçici olarak kapalı."}
                            </div>
                        ) : (
                            <div className="grid gap-4 2xl:grid-cols-2">
                                {catalog.bundles.map((bundle) => (
                                    <BundleCard
                                        key={bundle.id}
                                        bundle={bundle}
                                        couponReady={catalog.liveops.couponsEnabled && couponCode.trim().length > 0}
                                        busy={busyKey === `bundle:${bundle.id}`}
                                        onBuy={handleBuyBundle}
                                        onPreviewCoupon={() => void handlePreviewCoupon({ kind: "bundle", id: bundle.id })}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function ShopItemCard({
    item,
    onBuy,
    onPreviewCoupon,
    busy,
    couponReady,
    itemInitial,
}: {
    item: CatalogStoreItemView;
    onBuy: (item: CatalogStoreItemView) => void;
    onPreviewCoupon: () => void;
    busy: boolean;
    couponReady: boolean;
    itemInitial: string;
}) {
    const buttonLabel = item.equipped ? "Kullanılıyor" : item.owned ? "Sahipsin" : busy ? "Alınıyor..." : "Satın Al";
    const buttonStyle = item.owned
        ? item.equipped
            ? "bg-blue-500 text-white cursor-default"
            : "bg-green-500 text-white cursor-default"
        : SHOP_RARITY_BUY_BUTTON_CLASS[item.rarity];

    return (
        <div
            className={`group relative rounded-[26px] border p-4 transition-all hover:-translate-y-1 hover:bg-white/60 dark:hover:bg-slate-800/60 ${item.isFeatured
                ? "border-fuchsia-200/80 bg-gradient-to-b from-white/70 to-fuchsia-50/50 dark:border-fuchsia-900/50 dark:from-slate-800/70 dark:to-fuchsia-950/20"
                : SHOP_RARITY_CARD_CLASS[item.rarity]
                } ${SHOP_RARITY_HALO_CLASS[item.rarity]}`}
        >
            <div className={`absolute inset-x-4 top-0 h-1 rounded-b-full opacity-80 ${SHOP_RARITY_TOP_STRIP_CLASS[item.rarity]}`} />
            <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-700/50">
                {item.badgeText ? (
                    <div className="absolute left-2 top-2 z-10">
                        <span className="rounded-full bg-blue-600/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
                            {item.badgeText}
                        </span>
                    </div>
                ) : null}
                <div className="absolute right-2 top-2 z-10">
                    <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm backdrop-blur-sm ${SHOP_RARITY_BADGE_CLASS[item.rarity]}`}
                    >
                        {item.rarity}
                    </span>
                </div>
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800">
                    {item.imageUrl ? (
                        <Image
                            loader={passthroughImageLoader}
                            unoptimized
                            src={item.imageUrl}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-full object-cover shadow-lg"
                        />
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-black text-white shadow-lg">
                            {itemInitial}
                        </div>
                    )}
                </div>
            </div>
            <h4 className="truncate text-sm font-bold text-slate-800 dark:text-white">
                {item.name}
            </h4>
            <div className="mt-1 text-[11px] font-medium capitalize text-slate-500 dark:text-slate-400">
                {formatItemTypeLabel(item.type)}
            </div>
            {item.pricing.discountCoin > 0 && item.pricing.appliedPromotion && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <BadgePercent size={10} />
                    {item.pricing.appliedPromotion.name}
                </div>
            )}
            <div className="mt-3 flex items-end justify-between gap-3">
                <div className="flex flex-col">
                    {item.pricing.discountCoin > 0 && (
                        <span className="text-[11px] text-slate-400 line-through">
                            {item.pricing.basePriceCoin.toLocaleString()}
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-xs font-black text-amber-500">
                        {item.pricing.finalPriceCoin.toLocaleString()}
                        <CoinMark className="h-4 w-4 ring-0 shadow-none" iconClassName="h-2.5 w-2.5" />
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {couponReady && !item.owned && (
                        <button
                            type="button"
                            onClick={onPreviewCoupon}
                            disabled={busy}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            Kullan
                        </button>
                    )}
                    <button
                        onClick={() => onBuy(item)}
                        disabled={busy || item.owned}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all disabled:opacity-50 ${buttonStyle}`}
                        type="button"
                    >
                        {buttonLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function BundleCard({
    bundle,
    couponReady,
    busy,
    onBuy,
    onPreviewCoupon,
}: {
    bundle: CatalogBundleView;
    couponReady: boolean;
    busy: boolean;
    onBuy: (bundle: CatalogBundleView) => void;
    onPreviewCoupon: () => void;
}) {
    const disabled = busy || bundle.fullyOwned || bundle.ownedItemCount > 0;

    return (
        <article className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white/80 via-slate-50/80 to-white/70 p-5 shadow-sm dark:border-slate-700/50 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-950/60">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white dark:bg-slate-100 dark:text-slate-900">
                        Paket
                    </div>
                    <h4 className="mt-3 text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                        {bundle.name}
                    </h4>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {bundle.description}
                    </p>
                </div>
                <CoinBadge
                    value={bundle.pricing.finalPriceCoin}
                    label="Paket Fiyatı"
                    className="min-w-[132px] px-3 py-2"
                    valueClassName="text-base"
                />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                {bundle.items.map((item) => (
                    <div
                        key={item.id}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${SHOP_RARITY_CARD_CLASS[item.itemRarity]}`}
                    >
                        {item.itemName}
                    </div>
                ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 text-sm">
                    {bundle.pricing.discountCoin > 0 && (
                        <span className="text-slate-400 line-through">
                            {bundle.pricing.basePriceCoin.toLocaleString()} coin
                        </span>
                    )}
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {bundle.ownedItemCount > 0
                            ? `${bundle.ownedItemCount} ürüne zaten sahipsin`
                            : `${bundle.items.length} kozmetik dahil`}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {couponReady && !bundle.fullyOwned && (
                        <button
                            type="button"
                            onClick={onPreviewCoupon}
                            disabled={busy}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Kullan
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onBuy(bundle)}
                        disabled={disabled}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                        {bundle.fullyOwned ? "Sahipsin" : bundle.ownedItemCount > 0 ? "Sahip Olduğun Ürün Var" : busy ? "Alınıyor..." : "Paketi Satın Al"}
                    </button>
                </div>
            </div>
        </article>
    );
}
