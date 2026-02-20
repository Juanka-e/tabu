"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Megaphone,
    Plus,
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    X,
    Loader2,
    Bell,
    Rocket,
    Star,
    Clock,
    Tag,
    ChevronDown,
    Pin,
    PinOff,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

/* ─── Types ──────────────────────────────────────────────────── */

interface Announcement {
    id: number;
    title: string;
    content: string;
    type: string;
    isVisible: boolean;
    isPinned: boolean;
    createdAt: string;
    version?: string;
    tags?: string;
    mediaUrl?: string;
    mediaType?: "image" | "youtube" | null;
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function AdminAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [formTitle, setFormTitle] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formType, setFormType] = useState<"guncelleme" | "duyuru">("guncelleme");
    const [formVisible, setFormVisible] = useState(true);
    const [formPinned, setFormPinned] = useState(false);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [formVersion, setFormVersion] = useState("");
    const [formTags, setFormTags] = useState("");
    const [formMediaUrl, setFormMediaUrl] = useState("");
    const [formMediaType, setFormMediaType] = useState<"image" | "youtube" | null>(null);

    // Deleting
    const [deleting, setDeleting] = useState<number | null>(null);
    const [togglingPin, setTogglingPin] = useState<number | null>(null);

    /* ─── Fetch ──────────────────────────────────────────────── */

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/announcements");
            const data = await res.json();
            setAnnouncements(data);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    /* ─── Form Handlers ──────────────────────────────────────── */

    const openCreate = () => {
        setEditing(null);
        setFormTitle("");
        setFormContent("");
        setFormType("guncelleme");
        setFormVisible(true);
        setFormPinned(false);
        setFormError("");
        setFormVersion("");
        setFormTags("");
        setFormMediaUrl("");
        setFormMediaType(null);
        setFormOpen(true);
    };

    const openEdit = (a: Announcement) => {
        setEditing(a);
        setFormTitle(a.title);
        setFormContent(a.content);
        setFormType(a.type as "guncelleme" | "duyuru");
        setFormVisible(a.isVisible);
        setFormPinned(a.isPinned);
        setFormError("");
        setFormVersion(a.version || "");
        setFormTags(a.tags || "");
        setFormMediaUrl(a.mediaUrl || "");
        setFormMediaType(a.mediaType || null);
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim()) {
            setFormError("Başlık boş olamaz.");
            return;
        }
        if (!formContent.trim() || formContent === "<p></p>") {
            setFormError("İçerik boş olamaz.");
            return;
        }

        setFormSaving(true);
        setFormError("");

        const body = {
            title: formTitle.trim(),
            content: formContent.trim(),
            type: formType,
            isVisible: formVisible,
            isPinned: formPinned,
            version: formVersion || null,
            tags: formTags || null,
            mediaUrl: formMediaUrl || null,
            mediaType: formMediaType || null,
        };

        try {
            const url = editing
                ? `/api/admin/announcements/${editing.id}`
                : "/api/admin/announcements";
            const method = editing ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                setFormError(err.error || "Bir hata oluştu.");
                return;
            }

            setFormOpen(false);
            fetchAnnouncements();
        } catch {
            setFormError("Ağ hatası.");
        } finally {
            setFormSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return;
        setDeleting(id);
        try {
            await fetch(`/api/admin/announcements/${id}`, {
                method: "DELETE",
            });
            fetchAnnouncements();
        } catch {
            /* ignore */
        } finally {
            setDeleting(null);
        }
    };

    const toggleVisibility = async (a: Announcement) => {
        try {
            await fetch(`/api/admin/announcements/${a.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: !a.isVisible }),
            });
            fetchAnnouncements();
        } catch {
            /* ignore */
        }
    };

    const togglePin = async (a: Announcement) => {
        setTogglingPin(a.id);
        try {
            await fetch(`/api/admin/announcements/${a.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPinned: !a.isPinned }),
            });
            fetchAnnouncements();
        } catch {
            /* ignore */
        } finally {
            setTogglingPin(null);
        }
    };

    /* ─── Render ─────────────────────────────────────────────── */

    // Sırala: Pinli önce, sonra tarih
    const sortedAnnouncements = [...announcements].sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Megaphone className="h-6 w-6 text-blue-500" />
                        Duyuru Yönetimi
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Toplam {announcements.length} duyuru
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors active:scale-95"
                >
                    <Plus size={18} />
                    Yeni Duyuru
                </button>
            </div>

            {/* Announcements List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2
                            size={24}
                            className="animate-spin text-blue-500"
                        />
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Megaphone
                            size={32}
                            className="mx-auto mb-3 opacity-30"
                        />
                        <p>Henüz duyuru yok.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-slate-800">
                        {sortedAnnouncements.map((a) => {
                            const isNew =
                                new Date(a.createdAt) >
                                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                            const tags = a.tags
                                ? a.tags.split(",").map((t) => t.trim())
                                : [];

                            return (
                                <div
                                    key={a.id}
                                    className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors ${
                                        !a.isVisible ? "opacity-50" : ""
                                    } ${a.isPinned ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}
                                >
                                    {/* Pin Badge */}
                                    {a.isPinned && (
                                        <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full shrink-0">
                                            <Pin size={12} fill="currentColor" />
                                            SABİT
                                        </div>
                                    )}

                                    {/* Icon */}
                                    <div className="mt-0.5">
                                        {a.type === "guncelleme" ? (
                                            <Bell
                                                size={20}
                                                className="text-blue-500"
                                            />
                                        ) : (
                                            <Megaphone
                                                size={20}
                                                className="text-amber-500"
                                            />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                {a.title}
                                            </h4>
                                            {isNew && (
                                                <span className="flex items-center gap-1 bg-amber-400 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
                                                    <Star
                                                        size={10}
                                                        fill="currentColor"
                                                    />{" "}
                                                    YENİ
                                                </span>
                                            )}
                                            {tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="flex items-center gap-0.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded"
                                                >
                                                    <Tag size={10} /> {tag}
                                                </span>
                                            ))}
                                            {a.version && (
                                                <div className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 font-mono text-[10px]">
                                                    {a.version}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 line-clamp-2">
                                            {a.content.replace(/<[^>]*>/g, "")}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-[10px] text-gray-400">
                                                {new Date(
                                                    a.createdAt
                                                ).toLocaleDateString("tr-TR", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </p>
                                            {a.mediaUrl && (
                                                <span className="text-[10px] text-blue-500">
                                                    • {a.mediaType === "youtube"
                                                        ? "Video"
                                                        : "Görsel"}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {/* Pin Toggle */}
                                        <button
                                            onClick={() => togglePin(a)}
                                            className={`p-1.5 rounded-lg transition-colors ${
                                                a.isPinned
                                                    ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20"
                                                    : "text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                            }`}
                                            title={a.isPinned ? "Pini kaldır" : "Sabitle"}
                                            disabled={togglingPin === a.id}
                                        >
                                            {togglingPin === a.id ? (
                                                <Loader2
                                                    size={15}
                                                    className="animate-spin"
                                                />
                                            ) : a.isPinned ? (
                                                <PinOff size={15} />
                                            ) : (
                                                <Pin size={15} />
                                            )}
                                        </button>

                                        <button
                                            onClick={() =>
                                                toggleVisibility(a)
                                            }
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                            title={
                                                a.isVisible
                                                    ? "Gizle"
                                                    : "Görünür Yap"
                                            }
                                        >
                                            {a.isVisible ? (
                                                <Eye size={15} />
                                            ) : (
                                                <EyeOff size={15} />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => openEdit(a)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            title="Düzenle"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(a.id)}
                                            disabled={
                                                deleting === a.id
                                            }
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                            title="Sil"
                                        >
                                            {deleting === a.id ? (
                                                <Loader2
                                                    size={15}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Trash2 size={15} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── Create / Edit Modal ───────────────────────── */}
            {formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editing
                                    ? "Duyuruyu Düzenle"
                                    : "Yeni Duyuru"}
                            </h3>
                            <button
                                onClick={() => setFormOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            {formError && (
                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
                                    {formError}
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Başlık
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) =>
                                        setFormTitle(e.target.value)
                                    }
                                    placeholder="Duyuru başlığı..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Tip
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            setFormType("guncelleme")
                                        }
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                            formType === "guncelleme"
                                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                                : "border-gray-200 dark:border-slate-600 text-gray-400"
                                        }`}
                                    >
                                        <Bell size={16} />
                                        Güncelleme
                                    </button>
                                    <button
                                        onClick={() => setFormType("duyuru")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                            formType === "duyuru"
                                                ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                                : "border-gray-200 dark:border-slate-600 text-gray-400"
                                        }`}
                                    >
                                        <Megaphone size={16} />
                                        Duyuru
                                    </button>
                                </div>
                            </div>

                            {/* Version & Tags Row */}
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                        Versiyon (Opsiyonel)
                                    </label>
                                    <input
                                        type="text"
                                        value={formVersion}
                                        onChange={(e) =>
                                            setFormVersion(e.target.value)
                                        }
                                        placeholder="v1.0.0"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                        Etiketler (virgülle ayrılmış)
                                    </label>
                                    <input
                                        type="text"
                                        value={formTags}
                                        onChange={(e) =>
                                            setFormTags(e.target.value)
                                        }
                                        placeholder="AI, Major, UI"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Media */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Medya (Opsiyonel)
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <button
                                        onClick={() => {
                                            setFormMediaType(
                                                formMediaType === "image"
                                                    ? null
                                                    : "image"
                                            );
                                            if (!formMediaType)
                                                setFormMediaUrl("");
                                        }}
                                        className={`px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-all flex items-center gap-2 ${
                                            formMediaType === "image"
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                                : "border-gray-200 dark:border-slate-600 text-gray-400"
                                        }`}
                                    >
                                        🖼️ Görsel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFormMediaType(
                                                formMediaType === "youtube"
                                                    ? null
                                                    : "youtube"
                                            );
                                            if (!formMediaType)
                                                setFormMediaUrl("");
                                        }}
                                        className={`px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-all flex items-center gap-2 ${
                                            formMediaType === "youtube"
                                                ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                                : "border-gray-200 dark:border-slate-600 text-gray-400"
                                        }`}
                                    >
                                        ▶️ YouTube
                                    </button>
                                </div>
                                {formMediaType && (
                                    <input
                                        type="text"
                                        value={formMediaUrl}
                                        onChange={(e) =>
                                            setFormMediaUrl(e.target.value)
                                        }
                                        placeholder={
                                            formMediaType === "youtube"
                                                ? "YouTube URL (https://www.youtube.com/watch?v=...)"
                                                : "Görsel URL"
                                        }
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                )}
                            </div>

                            {/* Content - Rich Text Editor */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    İçerik
                                </label>
                                <RichTextEditor
                                    content={formContent}
                                    onChange={setFormContent}
                                    placeholder="Duyuru içeriğini yazın... (Metin, link, görsel, video ekleyebilirsiniz)"
                                />
                            </div>

                            {/* Options Row */}
                            <div className="flex gap-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formVisible}
                                        onChange={(e) =>
                                            setFormVisible(e.target.checked)
                                        }
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        Oyunculara görünür
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formPinned}
                                        onChange={(e) =>
                                            setFormPinned(e.target.checked)
                                        }
                                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                        <Pin size={14} />
                                        Sabitle (üstte görünsün)
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => setFormOpen(false)}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={formSaving}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {formSaving && (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                )}
                                {editing ? "Güncelle" : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
