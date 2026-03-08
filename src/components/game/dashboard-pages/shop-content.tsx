"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
    Flame,
    UserCircle,
    Frame,
    Package,
    Clock,
    Coins,
} from "lucide-react";

type ShopCategory = "daily" | "avatars" | "frames" | "bundles";
type Rarity = "common" | "rare" | "epic" | "legendary";

interface ShopItem {
    id: number;
    name: string;
    type: string;
    rarity: Rarity;
    priceCoin: number;
    imageUrl: string;
    owned?: boolean;
}

const rarityBadgeColor: Record<Rarity, string> = {
    common: "bg-slate-500/90",
    rare: "bg-blue-500/90",
    epic: "bg-purple-600/90",
    legendary: "bg-amber-500/90",
};

const rarityGlow: Record<Rarity, string> = {
    common: "",
    rare: "hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    epic: "hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]",
    legendary: "hover:shadow-[0_0_25px_rgba(234,179,8,0.4)]",
};

const rarityBuyBtn: Record<Rarity, string> = {
    common: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600",
    rare: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20",
    epic: "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20",
    legendary: "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/30",
};

const categories: { id: ShopCategory; icon: typeof Flame; label: string }[] = [
    { id: "daily", icon: Flame, label: "Daily Offers" },
    { id: "avatars", icon: UserCircle, label: "Avatars" },
    { id: "frames", icon: Frame, label: "Frames" },
    { id: "bundles", icon: Package, label: "Bundles" },
];

export function ShopContent() {
    const { data: session } = useSession();
    const [category, setCategory] = useState<ShopCategory>("daily");
    const [items, setItems] = useState<ShopItem[]>([]);
    const [coinBalance, setCoinBalance] = useState(0);
    const [busyId, setBusyId] = useState(0);

    useEffect(() => {
        if (!session?.user) return;
        const load = async () => {
            try {
                const [itemRes, dashRes] = await Promise.all([
                    fetch("/api/store/items", { cache: "no-store" }),
                    fetch("/api/user/dashboard", { cache: "no-store" }),
                ]);
                if (itemRes.ok) {
                    const data = await itemRes.json();
                    setItems(Array.isArray(data) ? data : data.items ?? []);
                }
                if (dashRes.ok) {
                    const d = await dashRes.json();
                    setCoinBalance(d.coinBalance ?? 0);
                }
            } catch {
                // silently fail
            }
        };
        void load();
    }, [session]);

    const handleBuy = async (item: ShopItem) => {
        if (busyId || item.owned) return;
        setBusyId(item.id);
        try {
            const res = await fetch("/api/store/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: item.id }),
            });
            if (res.ok) {
                const data = await res.json();
                setCoinBalance(data.newBalance ?? coinBalance);
                setItems((prev) =>
                    prev.map((i) =>
                        i.id === item.id ? { ...i, owned: true } : i
                    )
                );
            }
        } catch {
            // silently fail
        } finally {
            setBusyId(0);
        }
    };

    const filtered =
        category === "daily"
            ? items.slice(0, 3) // Show first 3 as daily offers
            : category === "bundles"
                ? [] // Bundles are hardcoded below
                : items.filter((i) =>
                    category === "avatars"
                        ? i.type === "avatar"
                        : i.type === "frame"
                );

    return (
        <div className="p-8 md:p-10 max-w-5xl mx-auto h-full flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                        Item Shop
                        <span className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                            Season 4
                        </span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                        Upgrade your style and power up.
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
                {/* Category nav */}
                <div className="w-full lg:w-48 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const active = category === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${active
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-bold"
                                    : "hover:bg-white/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                            >
                                <Icon size={18} />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* Items area */}
                <div className="flex-1 overflow-y-auto pb-8">
                    {/* Daily offers */}
                    {category === "daily" && (
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Clock size={14} className="text-red-500" />
                                    Ends in 04:22:10
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {filtered.map((item) => (
                                        <DailyOfferCard
                                            key={item.id}
                                            item={item}
                                            onBuy={handleBuy}
                                            busy={busyId === item.id}
                                        />
                                    ))}
                                </div>
                            </section>
                            <section>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                                    Featured Bundles
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <BundleCard
                                        title="Cyber Warrior Pack"
                                        description="Includes skin, weapon frame, and 500 bonus gold."
                                        rarity="Legendary"
                                        price={2500}
                                        oldPrice={3500}
                                        gradient="from-blue-600 to-indigo-600"
                                    />
                                    <BundleCard
                                        title="Druid's Blessing"
                                        description="Complete avatar set with nature effects."
                                        rarity="Rare"
                                        price={1800}
                                        gradient="from-emerald-600 to-teal-600"
                                    />
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Avatars / Frames */}
                    {(category === "avatars" || category === "frames") && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    Available{" "}
                                    {category === "avatars" ? "Avatars" : "Frames"}
                                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px]">
                                        {filtered.length}
                                    </span>
                                </h3>
                                <div className="flex gap-2">
                                    <button className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                                        Sort by Price
                                    </button>
                                    <button className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                                        Sort by Rarity
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filtered.map((item) => (
                                    <ShopItemCard
                                        key={item.id}
                                        item={item}
                                        onBuy={handleBuy}
                                        busy={busyId === item.id}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bundles */}
                    {category === "bundles" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BundleCard
                                title="Cyber Warrior Pack"
                                description="Includes skin, weapon frame, and 500 bonus gold."
                                rarity="Legendary"
                                price={2500}
                                oldPrice={3500}
                                gradient="from-blue-600 to-indigo-600"
                            />
                            <BundleCard
                                title="Druid's Blessing"
                                description="Complete avatar set with nature effects."
                                rarity="Rare"
                                price={1800}
                                gradient="from-emerald-600 to-teal-600"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* Sub-components */

function DailyOfferCard({
    item,
    onBuy,
    busy,
}: {
    item: ShopItem;
    onBuy: (i: ShopItem) => void;
    busy: boolean;
}) {
    const discountPercent = Math.floor(Math.random() * 30) + 10;
    const original = Math.round(item.priceCoin / (1 - discountPercent / 100));
    return (
        <div className="group relative bg-white/40 dark:bg-slate-800/40 rounded-2xl p-4 border border-white/40 dark:border-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all hover:-translate-y-1">
            <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
                -{discountPercent}%
            </div>
            <div className="h-32 w-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl mb-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 rounded-full object-cover shadow-lg"
                    />
                ) : (
                    <span className="text-5xl">🎭</span>
                )}
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-1">
                {item.name}
            </h4>
            <div className="flex items-center justify-between mt-2">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 line-through">
                        {original}
                    </span>
                    <span className="text-sm font-black text-amber-500 flex items-center gap-1">
                        {item.priceCoin} <Coins size={12} />
                    </span>
                </div>
                <button
                    onClick={() => onBuy(item)}
                    disabled={busy || item.owned}
                    className="bg-slate-800 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                    {item.owned ? "Owned" : busy ? "..." : "Buy"}
                </button>
            </div>
        </div>
    );
}

function ShopItemCard({
    item,
    onBuy,
    busy,
}: {
    item: ShopItem;
    onBuy: (i: ShopItem) => void;
    busy: boolean;
}) {
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
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 rounded-full object-cover shadow-lg"
                        />
                    ) : (
                        <span className="text-5xl">🎭</span>
                    )}
                </div>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">
                {item.name}
            </h4>
            <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                    {item.priceCoin.toLocaleString()} <Coins size={10} />
                </span>
                <button
                    onClick={() => onBuy(item)}
                    disabled={busy || item.owned}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 ${item.owned
                        ? "bg-green-500 text-white cursor-default"
                        : rarityBuyBtn[item.rarity]
                        }`}
                >
                    {item.owned ? "Owned" : busy ? "..." : "Buy"}
                </button>
            </div>
        </div>
    );
}

function BundleCard({
    title,
    description,
    rarity,
    price,
    oldPrice,
    gradient,
}: {
    title: string;
    description: string;
    rarity: string;
    price: number;
    oldPrice?: number;
    gradient: string;
}) {
    return (
        <div
            className={`bg-gradient-to-r ${gradient} rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer`}
        >
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="relative z-10">
                <div className="inline-block bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-2">
                    {rarity}
                </div>
                <h4 className="text-xl font-black mb-1">{title}</h4>
                <p className="text-white/80 text-xs mb-4 max-w-[70%]">
                    {description}
                </p>
                <div className="flex items-center gap-3">
                    <button className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-slate-100 transition-colors">
                        {price.toLocaleString()} <Coins size={10} className="inline" />
                    </button>
                    {oldPrice && (
                        <span className="text-xs text-white/60 line-through font-medium">
                            {oldPrice.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
