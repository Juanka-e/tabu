"use client";

import { useState, useEffect } from "react";
import {
    Megaphone,
    Bell,
    ChevronDown,
    X,
    Rocket,
    Star,
    Clock,
    Tag,
    Pin,
} from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

interface Announcement {
    id: number;
    title: string;
    content: string;
    type: string;
    created_at: string;
    isPinned: boolean;
    version?: string;
    tags?: string;
    mediaUrl?: string;
    mediaType?: "image" | "youtube" | null;
}

interface AnnouncementsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AnnouncementsModal({
    isOpen,
    onClose,
}: AnnouncementsModalProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"updates" | "announcements">(
        "updates"
    );

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetch("/api/announcements/visible")
                .then((res) => res.json())
                .then((data) => {
                    setAnnouncements(data);
                    setLoading(false);
                })
                .catch(() => {
                    setLoading(false);
                });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const updates = announcements.filter((a) => a.type === "guncelleme");
    const notices = announcements.filter((a) => a.type === "duyuru");
    const activeItems = activeTab === "updates" ? updates : notices;

    const renderList = (items: Announcement[]) => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
            );
        }

        if (items.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-gray-400 dark:text-slate-600">
                    {activeTab === "updates" ? (
                        <Rocket
                            size={36}
                            strokeWidth={1}
                            className="mb-3 sm:mb-4 opacity-50"
                        />
                    ) : (
                        <Megaphone
                            size={36}
                            strokeWidth={1}
                            className="mb-3 sm:mb-4 opacity-50"
                        />
                    )}
                    <span className="text-xs sm:text-sm font-medium">
                        Bu kategoride henüz içerik yok.
                    </span>
                </div>
            );
        }

        return (
            <div className="space-y-3 sm:space-y-4">
                {items.map((item) => {
                    const isExpanded = expandedId === item.id;
                    const tags = item.tags
                        ? item.tags.split(",").map((t) => t.trim())
                        : [];
                    const isNew =
                        new Date(item.created_at) >
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                    return (
                        <div
                            key={item.id}
                            onClick={() =>
                                setExpandedId(isExpanded ? null : item.id)
                            }
                            className={`group relative rounded-xl sm:rounded-2xl border transition-all cursor-pointer overflow-hidden ${isExpanded
                                ? "bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900/50 shadow-lg ring-1 ring-blue-500/10"
                                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 hover:shadow-md"
                                } ${item.isPinned ? "ring-2 ring-amber-400/30" : ""}`}
                        >
                            <div className="p-3 sm:p-5">
                                {/* Meta Header Row */}
                                <div className="flex flex-wrap items-center justify-between gap-y-1.5 sm:gap-y-2 mb-2 sm:mb-3">
                                    {/* Left: Badges & Tags */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                        {item.isPinned && (
                                            <span className="flex items-center gap-0.5 bg-amber-400 text-white text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded shadow-sm">
                                                <Pin
                                                    size={8}
                                                    fill="currentColor"
                                                />{" "}
                                                SABİT
                                            </span>
                                        )}
                                        {isNew && (
                                            <span className="flex items-center gap-0.5 bg-blue-500 text-white text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded shadow-sm">
                                                <Star
                                                    size={8}
                                                    fill="currentColor"
                                                />{" "}
                                                YENİ
                                            </span>
                                        )}
                                        {tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="flex items-center gap-0.5 text-[8px] sm:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-100 dark:bg-slate-700/50 px-1 sm:px-1.5 py-0.5 rounded"
                                            >
                                                <Tag size={8} /> {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Right: Date & Version */}
                                    <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500">
                                        <div className="flex items-center gap-0.5 sm:gap-1">
                                            <Clock size={10} />
                                            {new Date(
                                                item.created_at
                                            ).toLocaleDateString("tr-TR", {
                                                day: "numeric",
                                                month: "short",
                                            })}
                                        </div>
                                        {item.version && (
                                            <div className="px-1 sm:px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 font-mono text-[8px] sm:text-[10px]">
                                                {item.version}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Title & Chevron */}
                                <div className="flex justify-between items-start gap-2 sm:gap-4">
                                    <h3
                                        className={`text-sm sm:text-lg font-bold leading-tight transition-colors ${isExpanded
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-slate-800 dark:text-white"
                                            }`}
                                    >
                                        {item.title}
                                    </h3>
                                    <div
                                        className={`p-1 rounded-full bg-gray-50 dark:bg-slate-700/50 text-gray-400 transition-transform duration-300 ${isExpanded
                                            ? "rotate-180 bg-blue-50 text-blue-500 dark:bg-blue-900/30"
                                            : "group-hover:bg-gray-100 dark:group-hover:bg-slate-700"
                                            }`}
                                    >
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            <div
                                className={`transition-all duration-300 ease-in-out ${isExpanded
                                    ? "max-h-[600px] sm:max-h-[800px] opacity-100"
                                    : "max-h-0 opacity-0"
                                    }`}
                            >
                                <div className="px-3 sm:px-5 pb-3 sm:pb-5 pt-0">
                                    <div className="h-px w-full bg-gray-100 dark:bg-slate-700 mb-3 sm:mb-4"></div>

                                    {item.mediaUrl && (
                                        <div className="mb-3 sm:mb-4 rounded-xl overflow-hidden shadow-md bg-black ring-1 ring-black/5">
                                            {item.mediaType === "youtube" ? (
                                                <div className="relative pt-[56.25%]">
                                                    <iframe
                                                        className="absolute inset-0 w-full h-full"
                                                        src={item.mediaUrl.replace(
                                                            "watch?v=",
                                                            "embed/"
                                                        )}
                                                        title="Content Video"
                                                        frameBorder="0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    ></iframe>
                                                </div>
                                            ) : (
                                                <img
                                                    src={item.mediaUrl}
                                                    alt={item.title}
                                                    className="w-full h-auto max-h-[200px] sm:max-h-[300px] object-cover"
                                                />
                                            )}
                                        </div>
                                    )}
                                    <div
                                        className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                            __html: typeof window !== 'undefined' ? DOMPurify.sanitize(item.content) : item.content,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl sm:max-w-3xl rounded-xl sm:rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col h-[85vh] sm:h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-6 pb-3 sm:pb-4 bg-white dark:bg-slate-900 z-10 border-b border-gray-100 dark:border-slate-800/50">
                    <div>
                        <h2 className="text-base sm:text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5 sm:gap-2">
                            {activeTab === "updates" ? (
                                <Rocket className="text-blue-500" size={18} />
                            ) : (
                                <Megaphone
                                    className="text-purple-500"
                                    size={18}
                                />
                            )}
                            {activeTab === "updates"
                                ? "Yenilikler"
                                : "Duyurular"}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                            Son gelişmeler ve haberler.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-3 sm:px-6 py-2 sm:py-4 flex gap-2 sm:gap-3 bg-gray-50/50 dark:bg-slate-900/50">
                    <button
                        onClick={() => {
                            setActiveTab("updates");
                            setExpandedId(null);
                        }}
                        className={`flex-1 relative py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === "updates"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                            }`}
                    >
                        Güncellemeler
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab("announcements");
                            setExpandedId(null);
                        }}
                        className={`flex-1 relative py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === "announcements"
                            ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                            : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                            }`}
                    >
                        Duyurular
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4 sm:p-6 custom-scrollbar bg-gray-50/30 dark:bg-slate-900">
                    {renderList(activeItems)}
                </div>
            </div>
        </div>
    );
}
