"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { useSession } from "next-auth/react";
import {
    Coins,
    Frame,
    ShoppingBag,
    UserCircle,
} from "lucide-react";
import type {
    DashboardDataResponse,
    StoreItemType,
    StoreItemView,
} from "@/types/economy";

type ShopCategory = "all" | StoreItemType;

const categories: { id: ShopCategory; icon: typeof ShoppingBag; label: string }[] = [
    { id: "all", icon: ShoppingBag, label: "All Items" },
    { id: "avatar", icon: UserCircle, label: "Avatars" },
    { id: "frame", icon: Frame, label: "Frames" },
    { id: "card_back", icon: ShoppingBag, label: "Card Backs" },
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

export function ShopContent() {
    const { data: session } = useSession();
    const [category, setCategory] = useState<ShopCategory>("all");
    const [items, setItems] = useState<StoreItemView[]>([]);
    const [coinBalance, setCoinBalance] = useState(0);
    const [busyId, setBusyId] = useState<number | null>(null);

    useEffect(() => {
        if (!session?.user) {
            return;
        }

        const load = async () => {
            try {
                const [itemsResponse, dashboardResponse] = await Promise.all([
                    fetch("/api/store/items", { cache: "no-store" }),
                    fetch("/api/user/dashboard", { cache: "no-store" }),
                ]);

                if (itemsResponse.ok) {
                    const payload = (await itemsResponse.json()) as { items: StoreItemView[] };
                    setItems(payload.items);
                }

                if (dashboardResponse.ok) {
                    const dashboard = (await dashboardResponse.json()) as DashboardDataResponse;
                    setCoinBalance(dashboard.coinBalance);
                }
            } catch {
                // Keep defaults when requests fail.
            }
        };

        void load();
    }, [session]);

    const filteredItems = useMemo(() => {
        if (category === "all") {
            return items;
        }
        return items.filter((item) => item.type === category);
    }, [category, items]);

    const availableCount = filteredItems.filter((item) => !item.owned).length;

    const handleBuy = async (item: StoreItemView) => {
        if (busyId !== null || item.owned) {
            return;
        }

        setBusyId(item.id);
        try {
            const response = await fetch("/api/store/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shopItemId: item.id }),
            });

            const payload = (await response.json()) as {
                coinBalance?: number;
            };

            if (!response.ok) {
                return;
            }

            setCoinBalance(payload.coinBalance ?? coinBalance);
            setItems((currentItems) =>
                currentItems.map((currentItem) =>
                    currentItem.id === item.id
                        ? { ...currentItem, owned: true }
                        : currentItem
                )
            );
        } catch {
            // Leave state unchanged on failure.
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="p-8 md:p-10 max-w-5xl mx-auto h-full flex flex-col">
            <header className="flex items-center justify-between mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                        Item Shop
                        <span className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                            Live Inventory
                        </span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                        Cosmetics only. No gameplay advantage.
                    </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-700/30 flex items-center gap-3 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-inner flex items-center justify-center ring-2 ring-yellow-100 dark:ring-yellow-800/50">
                        <Coins size={18} className="text-yellow-50 drop-shadow-md" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-500 tracking-wider">
                            Gold Coins
                        </span>
                        <span className="font-black text-slate-800 dark:text-white text-lg leading-none">
                            {coinBalance.toLocaleString()}
                        </span>
                    </div>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
                <div className="w-full lg:w-48 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                    {categories.map((shopCategory) => {
                        const Icon = shopCategory.icon;
                        const active = category === shopCategory.id;
                        return (
                            <button
                                key={shopCategory.id}
                                onClick={() => setCategory(shopCategory.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${active
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-bold"
                                    : "hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Available Items
                            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px]">
                                {filteredItems.length}
                            </span>
                        </h3>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {availableCount} purchasable
                        </div>
                    </div>

                    {filteredItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300/60 dark:border-slate-700/60 bg-white/30 dark:bg-slate-800/30 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                            No active shop items in this category. Add products from the admin panel.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredItems.map((item) => (
                                <ShopItemCard
                                    key={item.id}
                                    item={item}
                                    onBuy={handleBuy}
                                    busy={busyId === item.id}
                                    itemInitial={getItemInitial(item.name)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ShopItemCard({
    item,
    onBuy,
    busy,
    itemInitial,
}: {
    item: StoreItemView;
    onBuy: (item: StoreItemView) => void;
    busy: boolean;
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
            className={`bg-white/40 dark:bg-slate-800/40 rounded-2xl p-4 border border-white/40 dark:border-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all hover:-translate-y-1 group relative ${rarityGlow[item.rarity]}`}
        >
            <div className="relative w-full aspect-square bg-slate-200 dark:bg-slate-700/50 rounded-xl mb-3 overflow-hidden">
                <div className="absolute top-2 right-2 z-10">
                    <span
                        className={`text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm backdrop-blur-sm uppercase ${rarityBadgeColor[item.rarity]}`}
                    >
                        {item.rarity}
                    </span>
                </div>
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800">
                    {item.imageUrl ? (
                        <Image
                            loader={passthroughImageLoader}
                            unoptimized
                            src={item.imageUrl}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-full object-cover shadow-lg"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-lg">
                            {itemInitial}
                        </div>
                    )}
                </div>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">
                {item.name}
            </h4>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 capitalize">
                {item.type.replace("_", " ")}
            </div>
            <div className="flex items-center justify-between mt-3 gap-3">
                <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                    {item.priceCoin.toLocaleString()} <Coins size={10} />
                </span>
                <button
                    onClick={() => onBuy(item)}
                    disabled={busy || item.owned}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 ${buttonStyle}`}
                    type="button"
                >
                    {buttonLabel}
                </button>
            </div>
        </div>
    );
}
