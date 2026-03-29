"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCardBackTheme } from "@/lib/cosmetics/card-back";
import { resolveCardFaceTheme } from "@/lib/cosmetics/card-face";
import { buildCosmeticPatternStyle, getCosmeticMotionClass, getCosmeticMotionStyle } from "@/lib/cosmetics/effects";
import { resolveFrameTheme } from "@/lib/cosmetics/frame";
import type { StoreItemRarity, StoreItemRenderMode, StoreItemType, TemplateConfig } from "@/types/economy";

export interface CosmeticPreviewItem {
    name: string;
    type: StoreItemType;
    rarity: StoreItemRarity;
    renderMode: StoreItemRenderMode;
    imageUrl: string;
    templateKey: string | null;
    templateConfig: TemplateConfig | null;
}

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

export function formatCosmeticTypeLabel(type: StoreItemType): string {
    if (type === "avatar") return "Avatar";
    if (type === "frame") return "Çerçeve";
    if (type === "card_back") return "Kart Arkası";
    return "Kart Önü";
}

function getItemInitial(name: string) {
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
}

function applyHexAlpha(hex: string, opacity: number) {
    return `${hex}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

export function CosmeticMiniPreview({ item }: { item: CosmeticPreviewItem }) {
    if (item.type === "avatar") {
        return <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] border border-white/50 bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-[0_18px_38px_-24px_rgba(59,130,246,0.58)] dark:border-white/10">{item.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={item.imageUrl} alt={item.name} width={80} height={80} className="h-full w-full object-cover" /> : <span className="text-2xl font-black text-white">{getItemInitial(item.name)}</span>}</div>;
    }
    if (item.type === "frame") {
        const theme = resolveFrameTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
        if (!theme) {
            return <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-slate-900 text-2xl font-black text-white">{getItemInitial(item.name)}</div>;
        }
        const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.accentColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
        return <div className="relative h-20 w-20"><div className="absolute inset-0 rounded-[24px]" style={{ border: `${theme.thickness}px solid ${theme.accentColor}`, boxShadow: `0 0 ${theme.glowBlur}px ${applyHexAlpha(theme.glowColor, theme.glowOpacity)}` }} />{theme.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={theme.imageUrl} alt={item.name} fill className="rounded-[24px] object-cover opacity-85" /> : null}<div className={cn("absolute inset-0 rounded-[24px]", getCosmeticMotionClass(theme.motionPreset))} style={{ ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[12px] flex items-center justify-center rounded-[16px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-xl font-black text-white shadow-lg">{getItemInitial(item.name)}</div></div>;
    }
    return <div className={cn("relative h-24 w-[74px] overflow-hidden rounded-[18px] shadow-[0_18px_40px_-28px_rgba(15,23,42,0.5)]", item.type === "card_back" ? "bg-slate-900" : "bg-white")}><CosmeticCardPreviewSurface item={item} compact /></div>;
}

export function CosmeticLargePreview({ item }: { item: CosmeticPreviewItem }) {
    if (item.type === "avatar") {
        return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="space-y-5 text-center"><div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-[36px] border border-white/20 bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-[0_24px_60px_-34px_rgba(59,130,246,0.65)]">{item.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={item.imageUrl} alt={item.name} width={144} height={144} className="h-full w-full object-cover" /> : <span className="text-5xl font-black text-white">{getItemInitial(item.name)}</span>}</div><div><div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Oyuncu Kutusu</div><div className="mt-2 text-lg font-black text-slate-900 dark:text-white">{item.name}</div></div></div></div>;
    }
    if (item.type === "frame") {
        const theme = resolveFrameTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
        if (!theme) {
            return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="flex h-56 w-56 items-center justify-center rounded-[44px] bg-slate-900 text-5xl font-black text-white">{getItemInitial(item.name)}</div></div>;
        }
        const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.accentColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
        return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="relative flex h-56 w-56 items-center justify-center"><div className="absolute inset-0 rounded-[44px]" style={{ border: `${theme.thickness}px solid ${theme.accentColor}`, boxShadow: `0 0 ${theme.glowBlur}px ${applyHexAlpha(theme.glowColor, theme.glowOpacity)}` }} />{theme.frameStyle !== "solid" ? <div className="absolute inset-[14px] rounded-[34px] border" style={{ borderColor: theme.secondaryColor, opacity: theme.frameStyle === "double" ? 0.8 : 0.6 }} /> : null}{theme.imageUrl ? <Image loader={passthroughImageLoader} unoptimized src={theme.imageUrl} alt={item.name} fill className="rounded-[44px] object-cover opacity-85" /> : null}<div className={cn("absolute inset-0 rounded-[44px]", getCosmeticMotionClass(theme.motionPreset))} style={{ ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[34px] rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" /><div className="absolute inset-[58px] flex items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 text-4xl font-black text-white shadow-lg">{getItemInitial(item.name)}</div></div></div>;
    }
    return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="relative h-[272px] w-[198px] overflow-hidden rounded-[30px] border border-white/30 bg-slate-950 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.65)]"><CosmeticCardPreviewSurface item={item} /></div></div>;
}

function CosmeticCardPreviewSurface({ item, compact = false }: { item: CosmeticPreviewItem; compact?: boolean }) {
    if (item.type === "card_back") {
        const theme = resolveCardBackTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
        const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.borderColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
        return <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.98))]">{theme.overlayImageUrl ? <Image loader={passthroughImageLoader} unoptimized src={theme.overlayImageUrl} alt={item.name} fill className="object-cover opacity-90" /> : null}<div className={cn("absolute inset-0", getCosmeticMotionClass(theme.motionPreset))} style={{ ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[10%] rounded-[22px] border-2" style={{ borderColor: theme.borderColor }} /><div className="absolute inset-[20%] rounded-[16px] border" style={{ borderColor: theme.secondaryColor }} />{!compact ? <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-sm">Kart Arkası</div> : null}</div>;
    }

    const theme = resolveCardFaceTheme({ renderMode: item.renderMode, imageUrl: item.imageUrl, templateKey: item.templateKey, templateConfig: item.templateConfig, rarity: item.rarity });
    const patternStyle = buildCosmeticPatternStyle({ pattern: theme.pattern, primaryColor: theme.borderColor, secondaryColor: theme.secondaryColor, scale: theme.patternScale, opacity: theme.patternOpacity });
    const overlayStyle = theme.overlayImageUrl ? { backgroundImage: `linear-gradient(rgba(255,255,255,${theme.overlayOpacity * 0.7}), rgba(255,255,255,${theme.overlayOpacity * 0.7})), url(${theme.overlayImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
    return <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] text-slate-900"><div className="absolute inset-0" style={overlayStyle} /><div className={cn("absolute inset-[10px] rounded-[20px] border-2", getCosmeticMotionClass(theme.motionPreset))} style={{ borderColor: theme.borderColor, ...patternStyle, ...getCosmeticMotionStyle(theme.motionSpeedMs) }} /><div className="absolute inset-[18px] rounded-[16px] border bg-white/70 backdrop-blur-[1px]" style={{ borderColor: theme.secondaryColor }} />{compact ? <><div className="absolute inset-x-[24px] top-[18px] h-3 rounded-full bg-slate-900/15" /><div className="absolute inset-x-[28px] bottom-[18px] h-3 rounded-full bg-slate-900/12" /></> : <><div className="absolute inset-x-[20px] top-[22px] rounded-full bg-slate-900/85 px-3 py-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white">Tema</div><div className="absolute inset-x-6 top-[42%] -translate-y-1/2 text-center"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Kart Önü</div><div className="mt-2 text-lg font-black">{item.name}</div></div><div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 backdrop-blur-sm"><Sparkles className="h-3 w-3" />Oyun İçi</div></>}</div>;
}
