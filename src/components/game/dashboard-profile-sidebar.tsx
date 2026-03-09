"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { CoinMark } from "@/components/ui/coin-badge";
import type { DashboardDataResponse, InventoryItemView, UserInventoryResponse } from "@/types/economy";
import type { DashboardTab } from "./dashboard-nav";

interface ProfileSidebarProps {
    onTabChange: (tab: DashboardTab) => void;
}

interface SidebarState {
    displayName: string;
    coinBalance: number;
    totalMatches: number;
    winRate: number;
    equippedItems: InventoryItemView[];
}

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

function getInitial(name: string): string {
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "P";
}

export function DashboardProfileSidebar({ onTabChange }: ProfileSidebarProps) {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<SidebarState | null>(null);

    useEffect(() => {
        if (!session?.user) {
            return;
        }

        const load = async () => {
            try {
                const [dashboardResponse, inventoryResponse] = await Promise.all([
                    fetch("/api/user/dashboard", { cache: "no-store" }),
                    fetch("/api/user/me", { cache: "no-store" }),
                ]);

                if (!dashboardResponse.ok || !inventoryResponse.ok) {
                    return;
                }

                const dashboard = (await dashboardResponse.json()) as DashboardDataResponse;
                const inventory = (await inventoryResponse.json()) as UserInventoryResponse;

                setProfile({
                    displayName:
                        inventory.profile.displayName ||
                        inventory.name ||
                        session.user.name ||
                        "Player",
                    coinBalance: dashboard.coinBalance,
                    totalMatches: dashboard.totalMatches,
                    winRate: dashboard.winRate,
                    equippedItems: inventory.items.filter((item) => item.equipped),
                });
            } catch {
                // Sidebar can render fallback values.
            }
        };

        void load();
    }, [session]);

    const name = profile?.displayName || session?.user?.name || "Player";
    const initial = getInitial(name);
    const quickEquipItems = useMemo(
        () => (profile?.equippedItems ?? []).slice(0, 3),
        [profile?.equippedItems]
    );

    return (
        <aside className="w-72 min-w-[280px] h-full border-l border-slate-200/50 dark:border-slate-700/50 bg-white/40 dark:bg-black/20 flex-col backdrop-blur-md hidden lg:flex">
            <div className="p-8 flex flex-col items-center text-center">
                <div className="relative mb-4 group cursor-pointer">
                    <div className="w-24 h-24 rounded-2xl shadow-xl ring-2 ring-white/50 dark:ring-slate-700 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-3xl transform group-hover:scale-105 transition-transform">
                        {initial}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-md border-2 border-white dark:border-slate-800" />
                </div>

                <h2 className="text-xl font-black text-slate-800 dark:text-white">
                    {name}
                </h2>
                <p className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-6">
                    {profile?.totalMatches ?? 0} matches played
                </p>

                <div className="w-full bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 p-3 border border-slate-200/40 dark:border-slate-700/40">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Win Rate
                            </div>
                            <div className="text-lg font-black text-slate-800 dark:text-white">
                                {profile?.winRate ?? 0}%
                            </div>
                        </div>
                        <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 p-3 border border-slate-200/40 dark:border-slate-700/40">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Coins
                            </div>
                            <div className="text-lg font-black text-slate-800 dark:text-white flex items-center justify-center gap-1">
                                {profile?.coinBalance ?? 0}
                                <CoinMark className="h-5 w-5 ring-0 shadow-none" iconClassName="h-3 w-3" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full text-left">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        Quick Equip
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {quickEquipItems.map((item) => (
                            <button
                                key={item.inventoryItemId}
                                onClick={() => onTabChange("inventory")}
                                className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-md cursor-pointer hover:ring-2 ring-indigo-400 transition-all text-white font-black overflow-hidden"
                                title={item.name}
                                type="button"
                            >
                                {item.imageUrl ? (
                                    <Image
                                        loader={passthroughImageLoader}
                                        unoptimized
                                        src={item.imageUrl}
                                        alt={item.name}
                                        width={48}
                                        height={48}
                                        className="w-full h-full rounded-lg object-cover"
                                    />
                                ) : (
                                    getInitial(item.name)
                                )}
                            </button>
                        ))}
                        <button
                            onClick={() => onTabChange("inventory")}
                            className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            type="button"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-auto p-6 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Dashboard Access</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                        In-game + full page
                    </span>
                </div>
            </div>
        </aside>
    );
}
