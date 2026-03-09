"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { Clock } from "lucide-react";
import type { ResolvedCardBackTheme } from "@/lib/cosmetics/card-back";
import type { TransitionData } from "@/types/game";

interface TransitionScreenProps {
    transition: TransitionData;
    cardBackTheme?: ResolvedCardBackTheme | null;
}

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

function getTextureClass(texture: ResolvedCardBackTheme["texture"]): string {
    if (texture === "grid") {
        return "bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:18px_18px]";
    }
    if (texture === "dots") {
        return "bg-[radial-gradient(circle,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:18px_18px]";
    }
    if (texture === "diagonal") {
        return "bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.12)_75%,transparent_75%,transparent)] bg-[size:20px_20px]";
    }
    return "";
}

export function TransitionScreen({ transition, cardBackTheme }: TransitionScreenProps) {
    const textureClass = cardBackTheme ? getTextureClass(cardBackTheme.texture) : "";

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95">
            {cardBackTheme && (
                <div className="relative w-full max-w-[250px] sm:max-w-[280px] aspect-[3/4]">
                    <div
                        className="relative h-full overflow-hidden rounded-[2rem] border-4 shadow-2xl"
                        style={{
                            backgroundColor: cardBackTheme.surfaceColor,
                            borderColor: cardBackTheme.borderColor,
                            boxShadow: `0 20px 50px -25px ${cardBackTheme.accentColor}`,
                        }}
                    >
                        {cardBackTheme.overlayImageUrl && (
                            <Image
                                loader={passthroughImageLoader}
                                unoptimized
                                src={cardBackTheme.overlayImageUrl}
                                alt=""
                                aria-hidden="true"
                                fill
                                className="object-cover pointer-events-none"
                                style={{ opacity: cardBackTheme.overlayOpacity }}
                            />
                        )}
                        {textureClass && (
                            <div className={`absolute inset-0 pointer-events-none opacity-70 ${textureClass}`} aria-hidden="true" />
                        )}
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
                                    Next
                                </p>
                                <p
                                    className="text-xs font-semibold uppercase tracking-[0.3em]"
                                    style={{ color: cardBackTheme.detailColor }}
                                >
                                    Card Back
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
            )}

            <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-foreground">Sıradaki Tur</h2>
                <div className="space-y-1">
                    <p className="text-lg">
                        <span className="text-muted-foreground">Anlatıcı:</span>{" "}
                        <span className="font-semibold text-foreground">{transition.anlatici.ad}</span>
                        <span
                            className={`ml-2 rounded px-2 py-0.5 text-xs ${transition.anlatici.takim === "A"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                        >
                            {transition.anlatici.takim === "A" ? "Takım A" : "Takım B"}
                        </span>
                    </p>
                    {transition.gozetmen && (
                        <p className="text-base text-muted-foreground">Gözetmen: {transition.gozetmen.ad}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 text-4xl font-mono font-bold text-primary">
                <Clock className="h-8 w-8" />
                {transition.kalanSure}
            </div>
            <p className="text-sm text-muted-foreground">Tura hazırlanın...</p>
        </div>
    );
}
