"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
    Gamepad2,
    Trophy,
    BookOpen,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Gem,
} from "lucide-react";

interface DashData {
    coinBalance: number;
    totalMatches: number;
    totalWins: number;
    winRate: number;
    totalWordsGuessed: number;
    avgWordsPerMatch: number;
    totalTaboos: number;
    recentMatches: {
        id: number;
        roomCode: string;
        won: boolean;
        teamAScore: number;
        teamBScore: number;
        coinReward: number;
        createdAt: string;
    }[];
}

export function DashContent() {
    const { data: session } = useSession();
    const [data, setData] = useState<DashData | null>(null);

    useEffect(() => {
        if (!session?.user) return;
        const load = async () => {
            try {
                const res = await fetch("/api/user/dashboard", { cache: "no-store" });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch {
                // fail silently
            }
        };
        void load();
    }, [session]);

    const stats = [
        {
            label: "Matches",
            value: data?.totalMatches?.toLocaleString() ?? "—",
            icon: Gamepad2,
            color: "blue",
            sub: data ? `+${Math.min(data.totalMatches, 12)}` : null,
            subUp: true,
        },
        {
            label: "Win Rate",
            value: data ? `${data.winRate}%` : "—",
            icon: Trophy,
            color: "orange",
            sub: data && data.winRate >= 50 ? `Top ${Math.max(1, 100 - data.winRate)}%` : null,
            subUp: false,
        },
        {
            label: "Words",
            value: data?.totalWordsGuessed
                ? data.totalWordsGuessed >= 1000
                    ? `${(data.totalWordsGuessed / 1000).toFixed(1)}k`
                    : data.totalWordsGuessed.toString()
                : "—",
            icon: BookOpen,
            color: "emerald",
            sub: data ? `Avg ${data.avgWordsPerMatch?.toFixed(1) ?? "0"}` : null,
            subUp: false,
        },
        {
            label: "Taboos",
            value: data?.totalTaboos?.toString() ?? "—",
            icon: AlertTriangle,
            color: "red",
            sub: data ? "-5%" : null,
            subUp: false,
        },
    ];

    const colorMap: Record<string, string> = {
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
        <div className="p-8 md:p-10 max-w-4xl mx-auto">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                        Welcome back to the arena.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1 shadow-sm border border-yellow-200/50 dark:border-yellow-700/30">
                        {data?.coinBalance?.toLocaleString() ?? "—"}
                        <Gem size={14} />
                    </div>
                </div>
            </header>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => {
                    const Icon = stat.icon;
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
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${colorMap[stat.color]}`}
                                >
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white">
                                {stat.value}
                            </div>
                            {stat.sub && (
                                <div
                                    className={`text-xs font-bold mt-1 flex items-center ${stat.subUp
                                            ? "text-green-600"
                                            : "text-slate-500"
                                        }`}
                                >
                                    {stat.subUp && <TrendingUp size={14} className="mr-0.5" />}
                                    {stat.sub}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Recent Activity */}
            <div className="bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/30 dark:border-slate-700/30 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">
                        Recent Activity
                    </h4>
                    <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                        View All
                    </button>
                </div>
                <div className="space-y-3">
                    {(!data?.recentMatches || data.recentMatches.length === 0) && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No recent matches yet. Play a game to see your activity!
                        </div>
                    )}
                    {data?.recentMatches?.slice(0, 5).map((match) => (
                        <div
                            key={match.id}
                            className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-600 group"
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
                                        {new Date(match.createdAt).toLocaleDateString()}
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
                                    {match.teamAScore} - {match.teamBScore}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">
                                    Score
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
