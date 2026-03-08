"use client";

import { useState, useEffect, useCallback, type ReactNode, type MouseEvent } from "react";
import { X } from "lucide-react";
import { DashboardNav, type DashboardTab } from "./dashboard-nav";
import { DashboardProfileSidebar } from "./dashboard-profile-sidebar";

interface DashboardOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DashboardOverlay({ isOpen, onClose }: DashboardOverlayProps) {
    // Close on ESC
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleBackdrop = useCallback(
        (e: MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8 glass-overlay"
            onClick={handleBackdrop}
        >
            <div className="glass-panel w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden relative flex animate-fade-in-up">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-700/50 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 flex items-center justify-center backdrop-blur-sm transition-all text-slate-600 dark:text-slate-300 shadow-sm"
                >
                    <X size={16} />
                </button>

                <DashboardLayout />
            </div>
        </div>
    );
}

/**
 * Shared 3-column dashboard layout:  Nav | Content | Profile Sidebar
 * Used by both DashboardOverlay (in-game hover) and the full-page home.
 */
export function DashboardLayout({
    defaultTab = "dash",
    className = "",
    showPlayTab = false,
    playContent,
}: {
    defaultTab?: DashboardTab;
    className?: string;
    showPlayTab?: boolean;
    playContent?: ReactNode;
}) {
    const [activeTab, setActiveTab] = useState<DashboardTab>(defaultTab);

    return (
        <div className={`flex w-full h-full ${className}`}>
            {/* Nav sidebar */}
            <DashboardNav activeTab={activeTab} onTabChange={setActiveTab} showPlayTab={showPlayTab} />

            {/* Main content */}
            <main className="flex-1 h-full overflow-y-auto relative scroll-smooth">
                {activeTab === "play" && playContent ? (
                    playContent
                ) : (
                    <DashboardContent activeTab={activeTab} />
                )}
            </main>

            {/* Profile sidebar (hidden on mobile/tablet) */}
            <DashboardProfileSidebar onTabChange={setActiveTab} />
        </div>
    );
}

/* Lazy-load page content based on active tab */
function DashboardContent({
    activeTab,
}: {
    activeTab: DashboardTab;
}) {
    switch (activeTab) {
        case "dash":
            return <DashContentLazy />;
        case "inventory":
            return <InventoryContentLazy />;
        case "shop":
            return <ShopContentLazy />;
        case "settings":
            return <SettingsContentLazy />;
        default:
            return null;
    }
}

/* Dynamic imports for code splitting */
import dynamic from "next/dynamic";

const DashContentLazy = dynamic(
    () =>
        import("./dashboard-pages/dash-content").then((m) => ({
            default: m.DashContent,
        })),
    { loading: () => <PageLoading /> }
);

const InventoryContentLazy = dynamic(
    () =>
        import("./dashboard-pages/inventory-content").then((m) => ({
            default: m.InventoryContent,
        })),
    { loading: () => <PageLoading /> }
);

const ShopContentLazy = dynamic(
    () =>
        import("./dashboard-pages/shop-content").then((m) => ({
            default: m.ShopContent,
        })),
    { loading: () => <PageLoading /> }
);

const SettingsContentLazy = dynamic(
    () =>
        import("./dashboard-pages/settings-content").then((m) => ({
            default: m.SettingsContent,
        })),
    { loading: () => <PageLoading /> }
);

function PageLoading() {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

