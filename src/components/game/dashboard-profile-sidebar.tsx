"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Settings, Plus } from "lucide-react";
import type { DashboardTab } from "./dashboard-nav";

interface ProfileSidebarProps {
    onTabChange: (tab: DashboardTab) => void;
}

interface ProfileData {
    displayName: string;
    coinBalance: number;
    totalMatches: number;
    winRate: number;
    level: number;
    xp: number;
    xpNeeded: number;
    equippedAvatar: string | null;
    equippedFrame: string | null;
    equippedCardBack: string | null;
}

export function DashboardProfileSidebar({ onTabChange }: ProfileSidebarProps) {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<ProfileData | null>(null);

    useEffect(() => {
        if (!session?.user) return;
        const load = async () => {
            try {
                const res = await fetch("/api/user/dashboard", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    setProfile({
                        displayName: session.user?.name || "Player",
                        coinBalance: data.coinBalance ?? 0,
                        totalMatches: data.totalMatches ?? 0,
                        winRate: data.winRate ?? 0,
                        level: data.level ?? 1,
                        xp: data.xp ?? 0,
                        xpNeeded: data.xpNeeded ?? 3000,
                        equippedAvatar: data.equippedAvatar ?? null,
                        equippedFrame: data.equippedFrame ?? null,
                        equippedCardBack: data.equippedCardBack ?? null,
                    });
                }
            } catch {
                // silently fail, sidebar shows defaults
            }
        };
        void load();
    }, [session]);

    const name = profile?.displayName || session?.user?.name || "Player";
    const level = profile?.level ?? 1;
    const xp = profile?.xp ?? 0;
    const xpNeeded = profile?.xpNeeded ?? 3000;
    const xpPercent = xpNeeded > 0 ? Math.round((xp / xpNeeded) * 100) : 0;
    const initial = name.charAt(0).toUpperCase();

    return (
        <aside className="w-72 min-w-[280px] h-full border-l border-slate-200/50 dark:border-slate-700/50 bg-white/40 dark:bg-black/20 flex-col backdrop-blur-md hidden lg:flex">
            <div className="p-8 flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-4 group cursor-pointer">
                    <div className="w-24 h-24 rounded-2xl shadow-xl ring-2 ring-white/50 dark:ring-slate-700 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-3xl transform group-hover:scale-105 transition-transform">
                        {initial}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-md border-2 border-white dark:border-slate-800" />
                </div>

                {/* Name & Level */}
                <h2 className="text-xl font-black text-slate-800 dark:text-white">
                    {name}
                </h2>
                <p className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-6">
                    Level {level}
                </p>

                {/* XP Progress */}
                <div className="w-full bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 mb-6">
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                        <span>XP Progress</span>
                        <span className="text-slate-800 dark:text-white font-bold">
                            {xpPercent}%
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full shadow-sm relative overflow-hidden transition-all duration-500"
                            style={{ width: `${xpPercent}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2 text-right">
                        {xp.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                    </div>
                </div>

                {/* Quick Equip */}
                <div className="w-full text-left">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        Quick Equip
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-md cursor-pointer hover:ring-2 ring-indigo-400 transition-all">
                            <span className="text-white text-lg">🎭</span>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex-shrink-0 flex items-center justify-center shadow-md cursor-pointer hover:ring-2 ring-orange-400 transition-all opacity-50 hover:opacity-100">
                            <span className="text-white text-lg">🖼️</span>
                        </div>
                        <button
                            onClick={() => onTabChange("inventory")}
                            className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto p-6 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Server Time</span>
                    <span className="font-mono">
                        {new Date().toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: "UTC",
                        })}{" "}
                        UTC
                    </span>
                </div>
            </div>
        </aside>
    );
}
