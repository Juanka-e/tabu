"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { Clock3, PauseCircle, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import {
    buildCosmeticPatternStyle,
    getCosmeticMotionClass,
    getCosmeticMotionStyle,
} from "@/lib/cosmetics/effects";
import type { ResolvedCardBackTheme } from "@/lib/cosmetics/card-back";
import type { TransitionData } from "@/types/game";

interface TransitionScreenProps {
    transition: TransitionData;
    cardBackTheme?: ResolvedCardBackTheme | null;
    isHost?: boolean;
    onPauseResume?: () => void;
}

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

export function TransitionScreen({
    transition,
    cardBackTheme,
    isHost = false,
    onPauseResume,
}: TransitionScreenProps) {
    const motionClass = cardBackTheme ? getCosmeticMotionClass(cardBackTheme.motionPreset) : "";
    const motionStyle = cardBackTheme ? getCosmeticMotionStyle(cardBackTheme.motionSpeedMs) : undefined;
    const patternStyle = cardBackTheme
        ? buildCosmeticPatternStyle({
              pattern: cardBackTheme.pattern,
              primaryColor: cardBackTheme.borderColor,
              secondaryColor: cardBackTheme.secondaryColor,
              scale: cardBackTheme.patternScale,
              opacity: cardBackTheme.patternOpacity,
          })
        : undefined;

    return (
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 animate-in fade-in zoom-in-95">
            <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                {cardBackTheme ? (
                    <div className="relative mx-auto w-full max-w-[250px] aspect-[3/4] sm:max-w-[280px]">
                        <div
                            className="relative h-full overflow-hidden rounded-[2rem] border-4 shadow-2xl"
                            style={{
                                backgroundColor: cardBackTheme.surfaceColor,
                                borderColor: cardBackTheme.borderColor,
                                boxShadow: `0 20px 50px -25px ${cardBackTheme.accentColor}, 0 0 ${cardBackTheme.glowBlur}px -12px ${cardBackTheme.glowColor}${Math.round(
                                    cardBackTheme.glowOpacity * 255
                                )
                                    .toString(16)
                                    .padStart(2, "0")}`,
                            }}
                        >
                            {cardBackTheme.overlayImageUrl ? (
                                <Image
                                    loader={passthroughImageLoader}
                                    unoptimized
                                    src={cardBackTheme.overlayImageUrl}
                                    alt=""
                                    aria-hidden="true"
                                    fill
                                    className="pointer-events-none object-cover"
                                    style={{ opacity: cardBackTheme.overlayOpacity }}
                                />
                            ) : null}
                            {patternStyle ? (
                                <div
                                    className={`absolute inset-0 pointer-events-none ${motionClass}`}
                                    aria-hidden="true"
                                    style={{ ...patternStyle, ...motionStyle }}
                                />
                            ) : null}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                aria-hidden="true"
                                style={{
                                    background: `radial-gradient(circle at top left, ${cardBackTheme.accentColor}33, transparent 35%), radial-gradient(circle at bottom right, ${cardBackTheme.borderColor}33, transparent 38%)`,
                                }}
                            />
                            <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
                                <div
                                    className="rounded-full border px-4 py-1 text-[10px] font-black uppercase tracking-[0.35em]"
                                    style={{
                                        color: cardBackTheme.titleColor,
                                        borderColor: `${cardBackTheme.detailColor}66`,
                                        backgroundColor: `${cardBackTheme.accentColor}1F`,
                                    }}
                                >
                                    Tabu
                                </div>
                                <div className="space-y-3">
                                    <p
                                        className="text-3xl font-black uppercase tracking-[0.28em]"
                                        style={{ color: cardBackTheme.titleColor }}
                                    >
                                        Ready
                                    </p>
                                    <p
                                        className="text-xs font-semibold uppercase tracking-[0.3em]"
                                        style={{ color: cardBackTheme.detailColor }}
                                    >
                                        Hazırlık Ekranı
                                    </p>
                                </div>
                                <div
                                    className="h-24 w-24 rounded-full border-2"
                                    style={{
                                        borderColor: `${cardBackTheme.accentColor}99`,
                                        boxShadow: `0 0 0 8px ${cardBackTheme.accentColor}1A inset`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="rounded-[2rem] border border-white/60 bg-white/82 p-5 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.65)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/70 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                                <Sparkles className="h-3.5 w-3.5" />
                                Sıradaki Tur
                            </div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                Takımlar hazır olsun
                            </h2>
                            <p className="max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Yeni anlatıcı yerini alsın, gözetmen kontrolünü yapsın. Hazırlık akışı
                                yalnız oda yöneticisi tarafından durdurulup devam ettirilebilir.
                            </p>
                        </div>

                        <div className="rounded-[1.6rem] border border-slate-200/70 bg-slate-50/85 px-5 py-4 text-center dark:border-slate-700/70 dark:bg-slate-900/75">
                            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                                <Clock3 className="h-4 w-4" />
                                Geri Sayım
                            </div>
                            <div className="mt-2 text-5xl font-black tabular-nums text-slate-900 dark:text-white">
                                {transition.kalanSure}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">saniye</div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[1.4rem] border border-red-200/70 bg-red-50/75 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500 dark:text-red-300">
                                Anlatıcı
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xl font-black text-slate-900 dark:text-white">
                                        {transition.anlatici.ad}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {transition.anlatici.takim === "A" ? "Takım A" : "Takım B"}
                                    </div>
                                </div>
                                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-red-600 shadow-sm dark:bg-slate-900/70 dark:text-red-300">
                                    Aktif anlatım
                                </span>
                            </div>
                        </div>

                        <div className="rounded-[1.4rem] border border-blue-200/70 bg-blue-50/75 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500 dark:text-blue-300">
                                Gözetmen
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xl font-black text-slate-900 dark:text-white">
                                        {transition.gozetmen?.ad ?? "Bekleniyor"}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {transition.gozetmen
                                            ? transition.gozetmen.takim === "A"
                                                ? "Takım A"
                                                : "Takım B"
                                            : "Rakip takım oyuncusu"}
                                    </div>
                                </div>
                                <ShieldCheck className="h-8 w-8 text-blue-500 dark:text-blue-300" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {transition.oyunDurduruldu
                                ? "Hazırlık bekletildi. Devam ettirdiğinde geri sayım kaldığı yerden sürecek."
                                : "Oyuncular pozisyonunu alsın. Süre bittiğinde tur otomatik başlayacak."}
                        </div>
                        {isHost && onPauseResume ? (
                            <button
                                type="button"
                                onClick={onPauseResume}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                                    transition.oyunDurduruldu
                                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                        : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                                }`}
                            >
                                {transition.oyunDurduruldu ? (
                                    <PlayCircle className="h-4.5 w-4.5" />
                                ) : (
                                    <PauseCircle className="h-4.5 w-4.5" />
                                )}
                                {transition.oyunDurduruldu ? "Hazırlığı Devam Ettir" : "Hazırlığı Durdur"}
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
