"use client";

import { Check, X, ArrowRight, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { GameCard } from "@/components/game/game-card";
import type { GameState, CardData } from "@/types/game";

interface ActiveGameProps {
    gameState: GameState | null;
    card: CardData | null;
    myRole: string;
    narratorName: string;
    inspectorName: string;
    isHost: boolean;
    settings: { sure: number; mod: "tur" | "skor"; deger: number };
    onWordAction: (action: "dogru" | "tabu" | "pas") => void;
    onPauseResume: () => void;
    onResetGame: () => void;
}

export function ActiveGame({
    gameState,
    card,
    myRole,
    narratorName,
    inspectorName,
    isHost,
    settings,
    onWordAction,
    onPauseResume,
    onResetGame,
}: ActiveGameProps) {
    const activeTeam = gameState?.anlatacakTakim || "A";
    const timerPercent = gameState
        ? (gameState.kalanZaman / (gameState.toplamSure || settings.sure || 60)) * 100
        : 100;

    return (
        <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-5xl mx-auto w-full">
            {/* Top Info Bar */}
            <div className="w-full mb-6">
                {/* Scoreboard */}
                <div className="flex items-center justify-center gap-6 sm:gap-12 mb-6">
                    <div className="text-center">
                        <div className="text-4xl lg:text-5xl font-black text-red-600 dark:text-red-500 leading-none">
                            {gameState?.skor.A ?? 0}
                        </div>
                        <div className="text-[10px] sm:text-xs text-red-500/80 font-bold uppercase tracking-wider mt-1">
                            Takım A
                        </div>
                    </div>

                    {/* Timer with Progress Bar */}
                    <div className="flex flex-col items-center justify-center w-32 relative">
                        <div
                            className={`text-4xl font-black font-mono transition-colors ${activeTeam === "A"
                                ? "text-red-600 dark:text-red-500"
                                : "text-blue-600 dark:text-blue-500"
                                }`}
                        >
                            {gameState?.kalanZaman ?? 0}
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden shadow-inner">
                            <div
                                className={`h-full transition-all duration-1000 ease-linear ${activeTeam === "A" ? "bg-red-500" : "bg-blue-500"
                                    }`}
                                style={{ width: `${timerPercent}%` }}
                            />
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-4xl lg:text-5xl font-black text-blue-600 dark:text-blue-500 leading-none">
                            {gameState?.skor.B ?? 0}
                        </div>
                        <div className="text-[10px] sm:text-xs text-blue-500/80 font-bold uppercase tracking-wider mt-1">
                            Takım B
                        </div>
                    </div>
                </div>

                {/* Turn Info & Roles */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-4 text-xs sm:text-sm font-medium">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-slate-700">
                            <span className="text-gray-400 uppercase tracking-widest text-[10px]">
                                Anlatan
                            </span>
                            <span
                                className={`${activeTeam === "A"
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-blue-600 dark:text-blue-400"
                                    } font-bold`}
                            >
                                {narratorName}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-slate-700">
                            <span className="text-gray-400 uppercase tracking-widest text-[10px]">
                                Gözetmen
                            </span>
                            <span
                                className={`${activeTeam === "A"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-red-600 dark:text-red-400"
                                    } font-bold`}
                            >
                                {inspectorName}
                            </span>
                        </div>
                    </div>

                    {/* Round Progress */}
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {gameState && gameState.toplamTur > 0
                            ? `Tur ${gameState.mevcutTur} / ${gameState.toplamTur}`
                            : settings.mod === "skor"
                                ? `Hedef Skor: ${settings.deger}`
                                : ""}
                    </div>

                    {/* Golden Score */}
                    {gameState?.altinSkorAktif && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs">
                            <Sparkles className="h-3.5 w-3.5" />
                            ALTIN SKOR
                        </span>
                    )}
                </div>
            </div>

            {/* Game Card Area */}
            <div className="flex-1 flex items-center justify-center relative min-h-[350px]">
                {/* Card for narrator and inspector */}
                {card && (myRole === "Anlatıcı" || myRole === "Gözetmen") && (
                    <div className="w-full flex justify-center animate-fade-in">
                        <GameCard card={card} />
                    </div>
                )}

                {/* Guessing screen */}
                {myRole === "Tahminci" && (
                    <div className="text-center p-10 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 max-w-sm animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                            Tahmin Et!
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {narratorName} kelimeyi anlatıyor. Doğru cevabı bulmaya çalış!
                        </p>
                    </div>
                )}
            </div>

            {/* Narrator Controls */}
            {myRole === "Anlatıcı" && (
                <div className="mt-auto pt-6">
                    <div className="w-full max-w-md mx-auto grid grid-cols-3 gap-3">
                        <button
                            onClick={() => onWordAction("dogru")}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl shadow-md font-bold flex flex-col items-center justify-center transition-transform active:scale-95"
                        >
                            <Check size={24} className="mb-1" />
                            <span className="text-sm">DOĞRU</span>
                        </button>

                        <button
                            onClick={() => onWordAction("tabu")}
                            className="bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl shadow-md font-bold flex flex-col items-center justify-center transition-transform active:scale-95"
                        >
                            <X size={24} className="mb-1" />
                            <span className="text-sm">TABU</span>
                        </button>

                        <button
                            onClick={() => onWordAction("pas")}
                            disabled={(gameState?.kalanPasHakki ?? 0) <= 0}
                            className="bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 text-white py-4 rounded-xl shadow-md font-bold flex flex-col items-center justify-center transition-transform active:scale-95"
                        >
                            <ArrowRight size={24} className="mb-1" />
                            <span className="text-sm">PAS ({gameState?.kalanPasHakki ?? 0})</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Inspector TABU button */}
            {myRole === "Gözetmen" && (
                <div className="mt-auto pt-6">
                    <div className="w-full max-w-md mx-auto">
                        <button
                            onClick={() => onWordAction("tabu")}
                            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-xl shadow-md font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            <X size={24} />
                            <span>TABU</span>

                        </button>
                    </div>
                </div>
            )}

            {/* Host Controls */}
            {isHost && (
                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={onPauseResume}
                        className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2 text-sm font-bold py-2 px-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all active:scale-95"
                    >
                        <Pause size={18} /> Durdur
                    </button>
                    <button
                        onClick={onResetGame}
                        className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-2 text-sm font-bold py-2 px-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all active:scale-95"
                    >
                        <RotateCcw size={18} /> Lobiye Dön
                    </button>
                </div>
            )}

            {/* Paused Overlay */}
            {gameState?.oyunDurduruldu && (
                <div className="absolute inset-0 z-50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                    {isHost ? (
                        <button
                            onClick={onPauseResume}
                            className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
                        >
                            <Play size={32} className="ml-1" />
                        </button>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-400 dark:bg-slate-600 text-white rounded-full flex items-center justify-center shadow-2xl mx-auto">
                                <Pause size={32} />
                            </div>
                            <p className="text-sm text-gray-500 font-medium">Oyun duraklatıldı</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
