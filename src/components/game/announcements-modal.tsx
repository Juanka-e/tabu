"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
    ChevronDown,
    Clock,
    Megaphone,
    Pin,
    Rocket,
    Star,
    Tag,
    X,
} from "lucide-react";
import type { AnnouncementBlocks } from "@/lib/announcements/content";
import { AnnouncementBlocksView } from "@/components/game/announcement-blocks-view";

interface Announcement {
    id: number;
    title: string;
    contentBlocks: AnnouncementBlocks;
    preview: string;
    type: "guncelleme" | "duyuru";
    created_at: string;
    isPinned: boolean;
    version?: string | null;
    tags?: string | null;
    mediaUrl?: string | null;
    mediaType?: "image" | "youtube" | null;
    isNew?: boolean;
}

interface AnnouncementsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AnnouncementsModal({ isOpen, onClose }: AnnouncementsModalProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"updates" | "announcements">("updates");

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const recentThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000;

        fetch("/api/announcements/visible", { cache: "no-store" })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error("request_failed");
                }
                return response.json();
            })
            .then((data: Announcement[]) => {
                setAnnouncements(
                    data.map((item) => ({
                        ...item,
                        isNew: new Date(item.created_at).getTime() > recentThreshold,
                    }))
                );
            })
            .catch(() => {
                setAnnouncements([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [isOpen]);

    const updates = useMemo(
        () => announcements.filter((announcement) => announcement.type === "guncelleme"),
        [announcements]
    );
    const notices = useMemo(
        () => announcements.filter((announcement) => announcement.type === "duyuru"),
        [announcements]
    );
    const activeItems = activeTab === "updates" ? updates : notices;

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-3 backdrop-blur-md">
            <div className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-slate-800">
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-black text-slate-800 dark:text-white">
                            {activeTab === "updates" ? (
                                <Rocket size={18} className="text-blue-500" />
                            ) : (
                                <Megaphone size={18} className="text-orange-500" />
                            )}
                            {activeTab === "updates" ? "Yenilikler" : "Duyurular"}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Son gelismeler ve yayinlanan duyurular.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <button
                        onClick={() => {
                            setActiveTab("updates");
                            setExpandedId(null);
                        }}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                            activeTab === "updates"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                        }`}
                    >
                        Guncellemeler
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("announcements");
                            setExpandedId(null);
                        }}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                            activeTab === "announcements"
                                ? "bg-orange-600 text-white shadow-md shadow-orange-500/20"
                                : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
                        }`}
                    >
                        Duyurular
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4 dark:bg-slate-900">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                        </div>
                    ) : activeItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 dark:text-slate-600">
                            {activeTab === "updates" ? <Rocket size={34} /> : <Megaphone size={34} />}
                            <p className="mt-3 text-sm font-medium">Bu kategoride henuz icerik yok.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                        {activeItems.map((item) => {
                            const isExpanded = expandedId === item.id;
                            const tags = item.tags
                                ? item.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
                                : [];

                            return (
                                <div
                                        key={item.id}
                                        className={`overflow-hidden rounded-2xl border transition-all ${
                                            isExpanded
                                                ? "border-blue-200 bg-white shadow-lg ring-1 ring-blue-500/10 dark:border-blue-900/50 dark:bg-slate-800"
                                                : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                            className="w-full p-4 text-left"
                                        >
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                {item.isPinned && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black text-white">
                                                        <Pin size={10} fill="currentColor" />
                                                        SABIT
                                                    </span>
                                                )}
                                                {item.isNew && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2 py-1 text-[10px] font-black text-white">
                                                        <Star size={10} fill="currentColor" />
                                                        YENI
                                                    </span>
                                                )}
                                                {item.version && (
                                                    <span className="rounded bg-gray-100 px-2 py-1 font-mono text-[10px] text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                                                        {item.version}
                                                    </span>
                                                )}
                                                {tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-700 dark:text-slate-300"
                                                    >
                                                        <Tag size={10} />
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                                        {item.title}
                                                    </h3>
                                                    <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                                                        {item.preview}
                                                    </p>
                                                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {new Date(item.created_at).toLocaleDateString("tr-TR", {
                                                                year: "numeric",
                                                                month: "long",
                                                                day: "numeric",
                                                            })}
                                                        </span>
                                                        <span>{item.contentBlocks.length} blok</span>
                                                    </div>
                                                </div>

                                                <ChevronDown
                                                    size={18}
                                                    className={`mt-1 shrink-0 text-gray-400 transition-transform ${
                                                        isExpanded ? "rotate-180" : ""
                                                    }`}
                                                />
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-gray-100 px-4 py-4 dark:border-slate-700">
                                                {item.mediaUrl && (
                                                    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-700">
                                                        {item.mediaType === "youtube" ? (
                                                            <div className="aspect-video">
                                                                <iframe
                                                                    src={item.mediaUrl}
                                                                    title={item.title}
                                                                    className="h-full w-full"
                                                                    frameBorder="0"
                                                                    loading="lazy"
                                                                    referrerPolicy="strict-origin-when-cross-origin"
                                                                    sandbox="allow-scripts allow-same-origin allow-presentation"
                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                    allowFullScreen
                                                                />
                                                            </div>
                                                        ) : (
                                                            <Image
                                                                src={item.mediaUrl}
                                                                alt={item.title}
                                                                width={1200}
                                                                height={675}
                                                                unoptimized
                                                                className="h-auto max-h-[320px] w-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                )}

                                                <AnnouncementBlocksView blocks={item.contentBlocks} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
