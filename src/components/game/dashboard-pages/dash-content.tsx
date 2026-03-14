"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
    Coins,
    Gamepad2,
    Target,
    Trophy,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import type { DashboardDataResponse } from "@/types/economy";
import { WALLET_UPDATED_EVENT } from "@/lib/wallet-events";

const statCardStyles = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
} as const;

type StatTone = keyof typeof statCardStyles;

interface StatCardConfig {
    label: string;
    value: string;
    icon: typeof Gamepad2;
    tone: StatTone;
    subLabel: string;
    trend: "up" | "neutral" | "down";
}

export function DashContent() {
    const { data: session } = useSession();
    const [data, setData] = useState<DashboardDataResponse | null>(null);

    useEffect(() => {
        if (!session?.user) {
            return;
        }

        const load = async () => {
            try {
                const response = await fetch("/api/user/dashboard", { cache: "no-store" });
                if (!response.ok) {
                    return;
                }

                const payload = (await response.json()) as DashboardDataResponse;
                setData(payload);
            } catch {
                // Leave panel in empty state.
            }
        };

        void load();

        const handleWalletUpdated = () => {
            void load();
        };

        window.addEventListener(WALLET_UPDATED_EVENT, handleWalletUpdated);
        return () => {
            window.removeEventListener(WALLET_UPDATED_EVENT, handleWalletUpdated);
        };
    }, [session]);

    const recentWins = data?.recentMatches.filter((match) => match.won).length ?? 0;
    const recentMatchCount = data?.recentMatches.length ?? 0;

    const stats: StatCardConfig[] = [
        {
            label: "Matches",
            value: data?.totalMatches.toLocaleString() ?? "0",
            icon: Gamepad2,
            tone: "blue",
            subLabel: `${recentMatchCount} recent results`,
            trend: "neutral",
        },
        {
            label: "Wins",
            value: data?.totalWins.toLocaleString() ?? "0",
            icon: Trophy,
            tone: "emerald",
            subLabel: `${data?.winRate ?? 0}% win rate`,
            trend: (data?.winRate ?? 0) >= 50 ? "up" : "neutral",
        },
        {
            label: "Coin Balance",
            value: data?.coinBalance.toLocaleString() ?? "0",
            icon: Coins,
            tone: "amber",
            subLabel: `${data?.totalCoinEarned ?? 0} earned overall`,
            trend: (data?.coinBalance ?? 0) > 0 ? "up" : "neutral",
        },
        {
            label: "Momentum",
            value: `${recentWins}/${recentMatchCount}`,
            icon: Target,
            tone: "violet",
            subLabel: "wins in recent matches",
            trend: recentMatchCount > 0 && recentWins < Math.ceil(recentMatchCount / 2) ? "down" : "up",
        },
    ];

    return (
        <div className="p-8 md:p-10 max-w-4xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                        Match history, wallet and recent performance.
                    </p>
                </div>
                <div className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1 shadow-sm border border-yellow-200/50 dark:border-yellow-700/30">
                    {data?.coinBalance.toLocaleString() ?? "0"}
                    <Coins size={14} />
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    const trendIcon =
                        stat.trend === "up" ? (
                            <TrendingUp size={14} className="mr-1" />
                        ) : stat.trend === "down" ? (
                            <TrendingDown size={14} className="mr-1" />
                        ) : null;

                    return (
                        <div
                            key={stat.label}
                            className="p-5 rounded-2xl bg-white/40 dark:bg-slate-800/40 shadow-sm border border-white/40 dark:border-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    {stat.label}
                                </span>
                                <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${statCardStyles[stat.tone]}`}
                                >
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white">
                                {stat.value}
                            </div>
                            <div className="text-xs font-bold mt-1 flex items-center text-slate-500 dark:text-slate-400">
                                {trendIcon}
                                {stat.subLabel}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/30 dark:border-slate-700/30 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">
                        Recent Activity
                    </h4>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Last {recentMatchCount} matches
                    </span>
                </div>
                <div className="space-y-3">
                    {(!data?.recentMatches || data.recentMatches.length === 0) && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No recent matches yet. Finish a game to populate your activity feed.
                        </div>
                    )}
                    {data?.recentMatches.map((match) => (
                        <div
                            key={match.id}
                            className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 group"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${match.won
                                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                        }`}
                                >
                                    {match.won ? "W" : "L"}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        Room {match.roomCode}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium">
                                        {new Date(match.createdAt).toLocaleDateString("tr-TR")}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div
                                    className={`font-bold text-lg ${match.won
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-500 dark:text-red-400"
                                        }`}
                                >
                                    {match.scoreA} - {match.scoreB}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-bold flex items-center justify-end gap-1">
                                    +{match.coinEarned}
                                    <Coins size={10} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
