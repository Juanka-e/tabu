"use client";

import {
    LayoutDashboard,
    Backpack,
    ShoppingBag,
    Settings,
    HelpCircle,
} from "lucide-react";

export type DashboardTab = "dash" | "inventory" | "shop" | "settings";

interface DashboardNavProps {
    activeTab: DashboardTab;
    onTabChange: (tab: DashboardTab) => void;
}

const navItems: { id: DashboardTab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "dash", icon: LayoutDashboard, label: "Dash" },
    { id: "inventory", icon: Backpack, label: "Inv" },
    { id: "shop", icon: ShoppingBag, label: "Shop" },
    { id: "settings", icon: Settings, label: "Settings" },
];

export function DashboardNav({ activeTab, onTabChange }: DashboardNavProps) {
    return (
        <nav className="w-20 min-w-[80px] h-full border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center py-8 bg-white/50 dark:bg-black/30 backdrop-blur-md z-10 max-md:hidden">
            {/* Logo */}
            <div className="mb-8">
                <div className="w-10 h-10 bg-gradient-to-tr from-red-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                    T
                </div>
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
            <div className="mt-auto flex flex-col gap-4 w-full">
                <button className="w-full py-3 flex flex-col items-center justify-center gap-1 transition-all text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                    <HelpCircle size={20} />
                </button>
            </div>
        </nav>
    );
}

/* Mobile bottom nav */
export function DashboardNavMobile({
    activeTab,
    onTabChange,
}: DashboardNavProps) {
    return (
        <nav className="w-full border-b border-slate-200/50 dark:border-slate-700/50 flex items-center py-2 px-4 bg-white/50 dark:bg-black/30 backdrop-blur-md justify-evenly md:hidden">
            {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`py-2 px-3 flex flex-col items-center justify-center gap-1 transition-all rounded-lg ${isActive
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                    >
                        <Icon size={20} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
