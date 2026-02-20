"use client";

import { Feather, Target, Flame, X } from "lucide-react";
import type { CardData, Difficulty } from "@/types/game";

interface GameCardProps {
    card: CardData;
}

const difficultyConfig: Record<
    Difficulty,
    {
        icon: typeof Feather;
        bg: string;
        label: string;
    }
> = {
    1: {
        icon: Feather,
        bg: "bg-blue-500",
        label: "Kolay",
    },
    2: {
        icon: Target,
        bg: "bg-purple-500",
        label: "Orta",
    },
    3: {
        icon: Flame,
        bg: "bg-red-500",
        label: "Zor",
    },
};

export function GameCard({ card }: GameCardProps) {
    const config = difficultyConfig[card.difficulty] || difficultyConfig[2];
    const Icon = config.icon;

    // If category color exists, it overrides the difficulty bg color
    const headerClass = card.categoryColor ? "" : config.bg;
    const headerStyle = card.categoryColor
        ? { backgroundColor: card.categoryColor }
        : {};

    return (
        <div className="w-full max-w-[320px] sm:max-w-[360px] mx-auto my-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border-4 border-white dark:border-slate-700 ring-1 ring-gray-200 dark:ring-slate-900">
                {/* Header Section — Solid Color with Main Word */}
                <div
                    className={`relative py-8 px-6 flex flex-col items-center justify-center text-center ${headerClass}`}
                    style={headerStyle}
                >
                    {/* Difficulty Icon (Top Right) */}
                    <div className="absolute top-4 right-4" title={`Zorluk: ${config.label}`}>
                        <Icon size={20} className="text-white opacity-80" />
                    </div>

                    {/* Main Word */}
                    <h2 className="text-4xl font-black text-white uppercase tracking-wider drop-shadow-md">
                        {card.word}
                    </h2>

                    {/* Subtle underline */}
                    <div className="mt-4 w-16 h-1 bg-white/40 rounded-full" />
                </div>

                {/* Body Section — Forbidden Words */}
                <div className="bg-white dark:bg-slate-800 px-8 py-8">
                    <div className="space-y-4">
                        {card.taboo.map((word, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 group"
                            >
                                <span className="text-red-500 dark:text-red-400 font-bold select-none">
                                    <X size={18} strokeWidth={3} />
                                </span>
                                <span className="text-xl font-semibold text-slate-800 dark:text-slate-200 tracking-tight uppercase">
                                    {word}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Decoration */}
                <div className="h-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700" />
            </div>
        </div>
    );
}
