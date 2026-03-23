"use client";

import Image from "next/image";
import {
    LayoutDashboard,
    Backpack,
    ShoppingBag,
    Settings,
    HelpCircle,
    Bell,
    Play,
} from "lucide-react";
import { useBranding } from "@/components/providers/branding-provider";

export type DashboardTab = "play" | "dash" | "inventory" | "shop" | "settings";

interface DashboardNavProps {
    activeTab: DashboardTab;
    onTabChange: (tab: DashboardTab) => void;
    showPlayTab?: boolean;
    supportEnabled?: boolean;
    notificationEnabled?: boolean;
    notificationUnreadCount?: number;
    onNotificationsClick?: () => void;
    onHelpClick?: () => void;
}

const navItems: { id: DashboardTab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "dash", icon: LayoutDashboard, label: "Dash" },
    { id: "inventory", icon: Backpack, label: "Inv" },
    { id: "shop", icon: ShoppingBag, label: "Shop" },
    { id: "settings", icon: Settings, label: "Settings" },
];

export function DashboardNav({
    activeTab,
    onTabChange,
    showPlayTab,
    supportEnabled = false,
    notificationEnabled = false,
    notificationUnreadCount = 0,
    onNotificationsClick,
    onHelpClick,
}: DashboardNavProps) {
    const branding = useBranding();
    const compactBrandAsset = branding.brandIconUrl || "";
    const compactLabel = branding.siteShortName.trim().charAt(0).toUpperCase() || "T";

    return (
        <nav className="w-20 min-w-[80px] h-full border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center py-8 bg-white/50 dark:bg-black/30 backdrop-blur-md z-10 max-md:hidden">
            {/* Logo or Play button */}
            <div className="mb-8">
                {showPlayTab ? (
                    <button
                        onClick={() => onTabChange("play")}
                        className={`flex w-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center shadow-lg transition-all ${activeTab === "play"
                                ? "bg-gradient-to-tr from-purple-500 to-blue-600 text-white scale-110 ring-2 ring-purple-400/40"
                                : "bg-gradient-to-tr from-purple-500 to-blue-600 text-white hover:scale-105"
                            }`}
                    >
                        <Play size={20} className="ml-0.5" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
                            Oyna
                        </span>
                    </button>
                ) : (
                    <div className="flex h-12 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-white/80 px-1 shadow-lg dark:border-slate-700/60 dark:bg-slate-900/70">
                        {compactBrandAsset ? (
                            <Image
                                src={compactBrandAsset}
                                alt={`${branding.siteName} logo`}
                                width={40}
                                height={40}
                                unoptimized
                                className="h-9 w-9 object-contain"
                            />
                        ) : (
                            <span className="bg-gradient-to-tr from-red-500 to-blue-500 bg-clip-text text-lg font-black text-transparent">
                                {compactLabel}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Nav items */}
            <div className="flex flex-col gap-6 w-full">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`w-full py-3 flex flex-col items-center justify-center gap-1 transition-all group ${isActive
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-r-[3px] border-blue-500"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                                }`}
                        >
                            <Icon
                                size={24}
                                className="group-hover:scale-110 transition-transform"
                            />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Help (bottom) */}
            {supportEnabled || notificationEnabled ? (
                <div className="mt-auto flex flex-col gap-4 w-full">
                    {notificationEnabled ? (
                        <button
                            type="button"
                            onClick={onNotificationsClick}
                            className="relative w-full py-3 flex flex-col items-center justify-center gap-1 transition-all text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                        >
                            <Bell size={20} />
                            {notificationUnreadCount > 0 ? (
                                <span className="absolute right-4 top-2 min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                                    {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
                                </span>
                            ) : null}
                            <span className="text-[10px] font-medium">Inbox</span>
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={onHelpClick}
                        className="w-full py-3 flex flex-col items-center justify-center gap-1 transition-all text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                    >
                        <HelpCircle size={20} />
                        <span className="text-[10px] font-medium">Help</span>
                    </button>
                </div>
            ) : null}
        </nav>
    );
}

/* Mobile bottom nav */
export function DashboardNavMobile({
    activeTab,
    onTabChange,
    showPlayTab,
}: DashboardNavProps) {
    const branding = useBranding();
    const compactBrandAsset = branding.brandIconUrl || "";
    const compactLabel = branding.siteShortName.trim().charAt(0).toUpperCase() || "T";
    const allItems = showPlayTab
        ? [{ id: "play" as DashboardTab, icon: Play, label: "Oyna" }, ...navItems]
        : navItems;

    return (
        <nav className="flex w-full items-center justify-between gap-3 border-b border-slate-200/50 bg-white/75 px-3 py-2 backdrop-blur-md dark:border-slate-700/50 dark:bg-black/40 md:hidden">
            <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/50 bg-white/70 px-2.5 py-2 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/70">
                {compactBrandAsset ? (
                    <Image
                        src={compactBrandAsset}
                        alt={`${branding.siteName} logo`}
                        width={32}
                        height={32}
                        unoptimized
                        className="h-8 w-8 flex-shrink-0 object-contain"
                    />
                ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-blue-500 text-xs font-black text-white">
                        {compactLabel}
                    </div>
                )}
                {!compactBrandAsset ? (
                    <div className="min-w-0">
                        <div className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-slate-800 dark:text-slate-100">
                            {branding.siteShortName}
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="scrollbar-hide flex flex-1 items-center justify-end gap-1 overflow-x-auto">
            {allItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`flex min-w-[58px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-all ${isActive
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "text-slate-500 dark:text-slate-400"
                            }`}
                    >
                        <Icon size={20} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                );
            })}
            </div>
        </nav>
    );
}

