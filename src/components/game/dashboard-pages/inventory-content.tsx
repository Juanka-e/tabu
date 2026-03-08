"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type ItemType = "avatar" | "frame" | "card_back";
type Rarity = "common" | "rare" | "epic" | "legendary";

interface InventoryItem {
    id: number;
    name: string;
    type: ItemType;
    rarity: Rarity;
    imageUrl: string;
    source: string;
    equipped: boolean;
}

const rarityColor: Record<Rarity, string> = {
    common: "bg-slate-500",
    rare: "bg-blue-500",
    epic: "bg-purple-500",
    legendary: "bg-yellow-500",
};

const rarityBorder: Record<Rarity, string> = {
    common: "border-slate-300/30 dark:border-slate-700/30",
    rare: "border-blue-300/30 dark:border-blue-700/30",
    epic: "border-purple-400/30 dark:border-purple-600/30",
    legendary: "border-yellow-400/30 dark:border-yellow-600/30",
};

const rarityGlow: Record<Rarity, string> = {
    common: "",
    rare: "",
    epic: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
    legendary: "shadow-[0_0_15px_rgba(234,179,8,0.3)]",
};

const tabs: { id: ItemType; label: string }[] = [
    { id: "avatar", label: "Avatars" },
    { id: "frame", label: "Frames" },
    { id: "card_back", label: "Card Backs" },
];

export function InventoryContent() {
    const { data: session } = useSession();
    const [activeType, setActiveType] = useState<ItemType>("avatar");
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [equipBusy, setEquipBusy] = useState(false);
    const [coinBalance, setCoinBalance] = useState(0);

    useEffect(() => {
        if (!session?.user) return;
        const load = async () => {
            try {
                const [itemRes, dashRes] = await Promise.all([
                    fetch("/api/store/items", { cache: "no-store" }),
                    fetch("/api/user/dashboard", { cache: "no-store" }),
                ]);
                if (itemRes.ok) {
                    const all = await itemRes.json();
                    // Filter to owned items (mock: show all for now)
                    setItems(
                        all.map((i: InventoryItem & { owned?: boolean; isEquipped?: boolean }) => ({
                            ...i,
                            equipped: i.isEquipped ?? false,
                            source: i.rarity === "legendary" ? "Season Reward" : "Shop Purchase",
                        }))
                    );
                }
                if (dashRes.ok) {
                    const dash = await dashRes.json();
                    setCoinBalance(dash.coinBalance ?? 0);
                }
            } catch {
                // silently fail
            }
        };
        void load();
    }, [session]);

    const filtered = items.filter((i) => i.type === activeType);

    const handleEquip = async (item: InventoryItem) => {
        setEquipBusy(true);
        try {
            const res = await fetch("/api/user/equip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: item.id }),
            });
            if (res.ok) {
                setItems((prev) =>
                    prev.map((i) => ({
                        ...i,
                        equipped:
                            i.type === item.type
                                ? i.id === item.id
                                : i.equipped,
                    }))
                );
            }
        } catch {
            // silently fail
        } finally {
            setEquipBusy(false);
        }
    };

    return (
        <div className="p-6 md:p-8 h-full flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        Inventory
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                        Manage your gear and appearance.
                    </p>
                </div>
                <div className="bg-white/40 dark:bg-slate-800/40 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm border border-slate-200/50 dark:border-slate-700/30 backdrop-blur-sm">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-b from-yellow-300 to-yellow-600 flex items-center justify-center border border-yellow-600/30 shadow-inner">
                        <span className="text-xs text-yellow-900 font-bold">$</span>
                    </div>
                    <span className="text-slate-700 dark:text-slate-200">
                        {coinBalance.toLocaleString()}
                    </span>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200/50 dark:border-slate-700/50 pb-1 flex-shrink-0 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveType(tab.id);
                            setSelectedItem(null);
                        }}
                        className={`px-5 py-2.5 rounded-t-lg text-sm font-bold transition-colors ${activeType === tab.id
                                ? "bg-white/60 dark:bg-slate-800/60 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-800/30"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Items grid */}
                <div className="flex-1 overflow-y-auto pr-2 pb-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className={`bg-white/40 dark:bg-slate-800/40 rounded-xl p-3 border hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all group relative flex flex-col cursor-pointer ${rarityBorder[item.rarity]
                                    } ${rarityGlow[item.rarity]} ${item.equipped ? "ring-2 ring-blue-500/50" : ""
                                    }`}
                            >
                                <div className="aspect-square rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700/50 dark:to-slate-800/50 mb-3 relative overflow-hidden flex items-center justify-center">
                                    <div
                                        className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider ${rarityColor[item.rarity]}`}
                                    >
                                        {item.rarity}
                                    </div>
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-full shadow-lg transform group-hover:scale-110 transition-transform duration-300 object-cover"
                                        />
                                    ) : (
                                        <span className="text-4xl">🎭</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                                        {item.source}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!item.equipped) handleEquip(item);
                                    }}
                                    disabled={item.equipped || equipBusy}
                                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${item.equipped
                                            ? "bg-blue-500 text-white cursor-default"
                                            : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600"
                                        }`}
                                >
                                    {item.equipped ? "Equipped" : "Equip"}
                                </button>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
                                No items in this category yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview panel (desktop only) */}
                {selectedItem && (
                    <div className="w-64 hidden xl:flex flex-col flex-shrink-0 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 backdrop-blur-sm">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">
                            Preview
                        </h3>
                        <div className="relative w-full aspect-[3/4] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-inner flex flex-col items-center justify-center p-4 mb-6 overflow-hidden">
                            <div className="w-24 h-24 rounded-full border-4 border-purple-500 shadow-xl overflow-hidden z-10 mb-4 ring-4 ring-purple-500/30 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                                {selectedItem.imageUrl ? (
                                    <img
                                        src={selectedItem.imageUrl}
                                        alt={selectedItem.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl text-white">🎭</span>
                                )}
                            </div>
                            <div className="text-center z-10">
                                <h4 className="font-black text-slate-800 dark:text-white text-lg">
                                    {session?.user?.name || "Player"}
                                </h4>
                            </div>
                        </div>
                        <div className="mt-auto">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-1">
                                {selectedItem.name}
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                {selectedItem.rarity.charAt(0).toUpperCase() +
                                    selectedItem.rarity.slice(1)}{" "}
                                {selectedItem.type.replace("_", " ")}
                            </p>
                            <div
                                className={`flex items-center gap-2 text-xs font-bold p-2 rounded-lg border ${selectedItem.rarity === "legendary"
                                        ? "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800/30"
                                        : selectedItem.rarity === "epic"
                                            ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/30"
                                            : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30"
                                    }`}
                            >
                                ✨{" "}
                                {selectedItem.rarity.charAt(0).toUpperCase() +
                                    selectedItem.rarity.slice(1)}{" "}
                                Rarity
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
