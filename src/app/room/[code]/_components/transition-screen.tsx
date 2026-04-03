"use client";

import { Clock3, Pause, Play, ShieldCheck, Sparkles } from "lucide-react";
import type { TransitionData } from "@/types/game";

interface TransitionScreenProps {
    transition: TransitionData;
    isHost?: boolean;
    onPauseResume?: () => void;
}

function getTeamLabel(team: string) {
    return team === "A" ? "Takım A" : "Takım B";
}

export function TransitionScreen({
    transition,
    isHost = false,
    onPauseResume,
}: TransitionScreenProps) {
    const narratorTeamLabel = getTeamLabel(transition.anlatici.takim);
    const inspectorTeamLabel = transition.gozetmen
        ? getTeamLabel(transition.gozetmen.takim)
        : "Rakip takımdan oyuncu bekleniyor";

    return (
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
            <div className="w-full max-w-3xl rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-[0_35px_100px_-55px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/78 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                            <Sparkles className="h-3.5 w-3.5" />
                            Hazırlık
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                                Tur birazdan başlıyor
                            </h2>
                            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Anlatıcı yerini alsın, gözetmen kontrolünü tamamlasın. Sayaç bittiğinde tur otomatik
                                olarak başlayacak.
                            </p>
                        </div>
                    </div>

                    {isHost && onPauseResume ? (
                        <button
                            type="button"
                            onClick={onPauseResume}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/70 px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-white hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                        >
                            {transition.oyunDurduruldu ? <Play size={16} /> : <Pause size={16} />}
                            {transition.oyunDurduruldu ? "Devam Ettir" : "Durdur"}
                        </button>
                    ) : null}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <section className="rounded-[1.6rem] border border-slate-200/75 bg-slate-50/85 p-5 dark:border-slate-800/80 dark:bg-slate-900/72">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                            <Clock3 className="h-4 w-4" />
                            Geri Sayım
                        </div>

                        <div className="mt-6 flex items-end gap-3">
                            <div className="text-6xl font-black tabular-nums leading-none text-slate-900 dark:text-white sm:text-7xl">
                                {transition.kalanSure}
                            </div>
                            <div className="pb-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                                saniye
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                            {transition.oyunDurduruldu ? (
                                <div className="space-y-1">
                                    <div className="font-bold text-slate-900 dark:text-white">Hazırlık bekletildi</div>
                                    <div>Host devam ettirdiğinde sayaç kaldığı yerden sürecek.</div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="font-bold text-slate-900 dark:text-white">Son kontrol aşaması</div>
                                    <div>Oyuncular yerini alsın. Sayaç sonunda ekran otomatik olarak oyuna geçecek.</div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="grid gap-3">
                        <div className="rounded-[1.4rem] border border-red-200/70 bg-red-50/80 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500 dark:text-red-300">
                                Anlatıcı
                            </div>
                            <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                                {transition.anlatici.ad}
                            </div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{narratorTeamLabel}</div>
                        </div>

                        <div className="rounded-[1.4rem] border border-blue-200/70 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-500 dark:text-blue-300">
                                        Gözetmen
                                    </div>
                                    <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                                        {transition.gozetmen?.ad ?? "Bekleniyor"}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {inspectorTeamLabel}
                                    </div>
                                </div>
                                <div className="rounded-full bg-white/85 p-2 text-blue-500 shadow-sm dark:bg-slate-950/70 dark:text-blue-300">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    <div className="rounded-full border border-slate-200/80 bg-slate-50/85 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                        Roller bu tur için sabitlendi.
                    </div>
                    <div className="rounded-full border border-slate-200/80 bg-slate-50/85 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                        Host isterse hazırlığı kısa süreli bekletebilir.
                    </div>
                </div>
            </div>
        </div>
    );
}
