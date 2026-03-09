"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { useSession } from "next-auth/react";
import {
    BadgePercent,
    Frame,
    ShoppingBag,
    TicketPercent,
    UserCircle,
} from "lucide-react";
import { CoinBadge, CoinMark } from "@/components/ui/coin-badge";
import type {
    CatalogBundleView,
    CatalogStoreItemView,
    CouponPreviewResponse,
    StoreCatalogResponse,
    StoreItemType,
} from "@/types/economy";

type ShopCategory = "all" | StoreItemType;
type BusyTarget = { kind: "shop_item" | "bundle"; id: number } | null;
type LayoutMode = "dashboard" | "page";

interface ShopContentProps {
    layout?: LayoutMode;
}

const categories: { id: ShopCategory; icon: typeof ShoppingBag; label: string }[] = [
    { id: "all", icon: ShoppingBag, label: "All Items" },
    { id: "avatar", icon: UserCircle, label: "Avatars" },
    { id: "frame", icon: Frame, label: "Frames" },
    { id: "card_back", icon: ShoppingBag, label: "Card Backs" },
    { id: "card_face", icon: ShoppingBag, label: "Card Faces" },
];

const rarityBadgeColor = {
    common: "bg-slate-500/90",
    rare: "bg-blue-500/90",
    epic: "bg-purple-600/90",
    legendary: "bg-amber-500/90",
} as const;

const rarityGlow = {
    common: "",
    rare: "hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    epic: "hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]",
    legendary: "hover:shadow-[0_0_25px_rgba(234,179,8,0.4)]",
} as const;

const rarityBuyBtn = {
    common: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600",
    rare: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20",
    epic: "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20",
    legendary: "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/30",
} as const;

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
    };
}

function targetKey(target: BusyTarget): string | null {
    return target ? `${target.kind}:${target.id}` : null;
}

export function ShopContent({ layout = "dashboard" }: ShopContentProps) {
    const { data: session } = useSession();
    const [category, setCategory] = useState<ShopCategory>("all");
    const [catalog, setCatalog] = useState<StoreCatalogResponse>(createEmptyCatalog);
    const [couponCode, setCouponCode] = useState("");
    const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
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
                detail: `${item.pricing.discountCoin} coin off`,
            }));
        const bundleOffers = catalog.bundles
            .filter((bundle) => bundle.pricing.discountCoin > 0)
            .map((bundle) => ({
                key: `bundle:${bundle.id}`,
                title: bundle.name,
                detail: `${bundle.pricing.discountCoin} coin off`,
            }));

        return [...itemOffers, ...bundleOffers].slice(0, 4);
    }, [catalog.bundles, catalog.items]);

    const availableCount = filteredItems.filter((item) => !item.owned).length;
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
                setCouponFeedback(payload.error || "Satin alma basarisiz.");
                return;
            }

            applyOwnedItems([item.id], payload.coinBalance ?? catalog.coinBalance);
            setCouponFeedback(payload.finalPriceCoin !== undefined ? `Satin alindi: ${payload.finalPriceCoin} coin` : null);
        } catch {
            setCouponFeedback("Satin alma istegi tamamlanamadi.");
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
                setCouponFeedback(payload.error || "Bundle satin alma basarisiz.");
                return;
            }

            const awardedItemIds = payload.awardedItems?.map((entry) => entry.id) ?? [];
            applyOwnedItems(awardedItemIds, payload.coinBalance ?? catalog.coinBalance);
            setCouponFeedback(payload.finalPriceCoin !== undefined ? `Bundle satin alindi: ${payload.finalPriceCoin} coin` : null);
        } catch {
            setCouponFeedback("Bundle satin alma istegi tamamlanamadi.");
        } finally {
            setBusyTarget(null);
        }
    };

    const handlePreviewCoupon = async (target: BusyTarget) => {
        const trimmedCouponCode = couponCode.trim();
        if (!target || !trimmedCouponCode) {
            setCouponFeedback("Kupon kodunu girip bir hedef sec.");
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
                setCouponFeedback(("error" in payload && payload.error) ? payload.error : "Kupon dogrulanamadi.");
                return;
            }

            if (!payload.valid || !payload.pricing || !payload.coupon) {
                setCouponFeedback(payload.reason || "Kupon bu hedef icin gecerli degil.");
                return;
            }

            setCouponFeedback(
                `${payload.coupon.code} uygulanir: ${payload.pricing.finalPriceCoin} coin`
            );
        } catch {
            setCouponFeedback("Kupon dogrulama istegi tamamlanamadi.");
        } finally {
            setBusyTarget(null);
        }
    };

    const containerClassName = layout === "dashboard"
        ? "p-8 md:p-10 max-w-5xl mx-auto h-full flex flex-col"
        : "rounded-[28px] border border-zinc-200/70 bg-white/90 p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/70";

    return (
        <div className={containerClassName}>
            <header className="mb-8 flex shrink-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                        Item Shop
                        <span className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                            Live Pricing
                        </span>
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Cosmetics only. Guest flow stays untouched, purchases require login.
                    </p>
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
                </div>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <CoinBadge value={catalog.coinBalance} label="Gold Coins" />
                    <div className="flex min-w-[280px] flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            <TicketPercent size={12} />
                            Coupon
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={couponCode}
                                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                                placeholder="WELCOME25"
                                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            />
                            <button
                                type="button"
                                onClick={() => setCouponFeedback("Kuponu secili satin almada test edebilirsin.")}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Ready
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Kod, sonraki satin alma istegine eklenir. Gecerlilik server tarafinda dogrulanir.
                        </p>
                    </div>
                </div>
            </header>

            {couponFeedback && (
                <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-200">
                    {couponFeedback}
                </div>
            )}

            <div className="flex flex-1 flex-col gap-8 overflow-hidden lg:flex-row">
                <div className="flex w-full shrink-0 flex-row gap-2 overflow-x-auto pb-2 lg:w-48 lg:flex-col lg:overflow-visible lg:pb-0">
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

                <div className="flex-1 overflow-y-auto pb-8">
                    <section>
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Available Items
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    {filteredItems.length}
                                </span>
                            </h3>
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {availableCount} purchasable
                            </div>
                        </div>

                        {filteredItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/30 p-10 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400">
                                No active shop items in this category. Add products from the admin panel.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                {filteredItems.map((item) => (
                                    <ShopItemCard
                                        key={item.id}
                                        item={item}
                                        onBuy={handleBuyItem}
                                        onPreviewCoupon={() => void handlePreviewCoupon({ kind: "shop_item", id: item.id })}
                                        busy={busyKey === `shop_item:${item.id}`}
                                        couponReady={couponCode.trim().length > 0}
                                        itemInitial={getItemInitial(item.name)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="mt-10">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Featured Bundles
                            </h3>
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {catalog.bundles.length} active bundle
                            </div>
                        </div>
                        {catalog.bundles.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/30 p-10 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400">
                                No active bundles yet.
                            </div>
                        ) : (
                            <div className="grid gap-4 xl:grid-cols-2">
                                {catalog.bundles.map((bundle) => (
                                    <BundleCard
                                        key={bundle.id}
                                        bundle={bundle}
                                        couponReady={couponCode.trim().length > 0}
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
    const buttonLabel = item.equipped ? "Equipped" : item.owned ? "Owned" : busy ? "Buying..." : "Buy";
    const buttonStyle = item.owned
        ? item.equipped
            ? "bg-blue-500 text-white cursor-default"
            : "bg-green-500 text-white cursor-default"
        : rarityBuyBtn[item.rarity];

    return (
        <div
            className={`group relative rounded-2xl border p-4 transition-all hover:-translate-y-1 hover:bg-white/60 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 ${item.isFeatured
                ? "border-fuchsia-200/80 bg-gradient-to-b from-white/70 to-fuchsia-50/50 dark:border-fuchsia-900/50 dark:from-slate-800/70 dark:to-fuchsia-950/20"
                : "border-white/40 bg-white/40 dark:border-slate-700/40"
                } ${rarityGlow[item.rarity]}`}
        >
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
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm backdrop-blur-sm ${rarityBadgeColor[item.rarity]}`}
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
                {item.type.replace("_", " ")}
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
                            Check Code
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
        <article className="rounded-3xl border border-slate-200/70 bg-white/60 p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/40">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white dark:bg-slate-100 dark:text-slate-900">
                        Bundle
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
                    label="Bundle Price"
                    className="min-w-[132px] px-3 py-2"
                    valueClassName="text-base"
                />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                {bundle.items.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300"
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
                            ? `${bundle.ownedItemCount} item already owned`
                            : `${bundle.items.length} cosmetics included`}
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
                            Check Code
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onBuy(bundle)}
                        disabled={disabled}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                        {bundle.fullyOwned ? "Owned" : bundle.ownedItemCount > 0 ? "Contains Owned Items" : busy ? "Buying..." : "Buy Bundle"}
                    </button>
                </div>
            </div>
        </article>
    );
}
