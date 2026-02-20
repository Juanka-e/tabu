"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    X,
    Loader2,
    BookOpen,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */

interface TabooWord {
    id: number;
    tabooWordText: string;
}

interface WordCategoryJoin {
    category: { id: number; name: string; color: string | null };
}

interface Word {
    id: number;
    wordText: string;
    difficulty: number;
    tabooWords: TabooWord[];
    wordCategories: WordCategoryJoin[];
}

interface CategoryOption {
    id: number;
    name: string;
    color: string | null;
    children?: { id: number; name: string }[];
}

/* ─── Difficulty helpers ─────────────────────────────────────── */

const difficultyLabel: Record<number, string> = {
    1: "Kolay",
    2: "Orta",
    3: "Zor",
};

const difficultyColor: Record<number, string> = {
    1: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    2: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    3: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

/* ─── Page ───────────────────────────────────────────────────── */

export default function AdminWordsPage() {
    // ── List State ──
    const [words, setWords] = useState<Word[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState("");
    const [filterDifficulty, setFilterDifficulty] = useState("");
    const [loading, setLoading] = useState(true);

    // ── Form State ──
    const [formOpen, setFormOpen] = useState(false);
    const [editingWord, setEditingWord] = useState<Word | null>(null);
    const [formWord, setFormWord] = useState("");
    const [formDifficulty, setFormDifficulty] = useState(1);
    const [formTabooWords, setFormTabooWords] = useState<string[]>([""]);
    const [formCategoryIds, setFormCategoryIds] = useState<number[]>([]);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // ── Category Options ──
    const [categories, setCategories] = useState<CategoryOption[]>([]);

    // ── Delete ──
    const [deleting, setDeleting] = useState<number | null>(null);

    /* ─── Fetch Data ─────────────────────────────────────────── */

    const fetchWords = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: page.toString(),
            limit: "15",
        });
        if (search) params.set("search", search);
        if (filterDifficulty) params.set("difficulty", filterDifficulty);

        try {
            const res = await fetch(`/api/admin/words?${params}`);
            const data = await res.json();
            setWords(data.words);
            setTotal(data.total);
            setPages(data.pages);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, [page, search, filterDifficulty]);

    useEffect(() => {
        fetchWords();

        // Fetch categories in parallel with words
        fetch("/api/admin/categories")
            .then((r) => r.json())
            .then((data: CategoryOption[]) => setCategories(data))
            .catch(() => { });
    }, [fetchWords]);

    /* ─── Form Handlers ──────────────────────────────────────── */

    const openCreate = () => {
        setEditingWord(null);
        setFormWord("");
        setFormDifficulty(1);
        setFormTabooWords(["", "", "", "", ""]);
        setFormCategoryIds([]);
        setFormError("");
        setFormOpen(true);
    };

    const openEdit = (w: Word) => {
        setEditingWord(w);
        setFormWord(w.wordText);
        setFormDifficulty(w.difficulty);
        const taboos = w.tabooWords.map((t) => t.tabooWordText);
        while (taboos.length < 5) taboos.push("");
        setFormTabooWords(taboos);
        setFormCategoryIds(w.wordCategories.map((wc) => wc.category.id));
        setFormError("");
        setFormOpen(true);
    };

    const handleSave = async () => {
        const cleanedTaboo = formTabooWords.filter((t) => t.trim());
        if (!formWord.trim()) {
            setFormError("Kelime boş olamaz.");
            return;
        }
        if (cleanedTaboo.length === 0) {
            setFormError("En az 1 yasaklı kelime gerekli.");
            return;
        }

        setFormSaving(true);
        setFormError("");

        const body = {
            wordText: formWord.trim(),
            difficulty: formDifficulty,
            tabooWords: cleanedTaboo,
            categoryIds: formCategoryIds,
        };

        try {
            const url = editingWord
                ? `/api/admin/words/${editingWord.id}`
                : "/api/admin/words";
            const method = editingWord ? "PUT" : "POST";
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
            fetchWords();
        } catch {
            setFormError("Ağ hatası.");
        } finally {
            setFormSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Bu kelimeyi silmek istediğinize emin misiniz?")) return;
        setDeleting(id);
        try {
            await fetch(`/api/admin/words/${id}`, { method: "DELETE" });
            fetchWords();
        } catch {
            /* ignore */
        } finally {
            setDeleting(null);
        }
    };

    /* ─── Taboo word field helpers ────────────────────────────── */

    const updateTaboo = (index: number, value: string) => {
        setFormTabooWords((prev) => {
            const copy = [...prev];
            copy[index] = value;
            return copy;
        });
    };

    const addTabooField = () => {
        setFormTabooWords((prev) => {
            if (prev.length < 10) {
                return [...prev, ""];
            }
            return prev;
        });
    };

    const removeTabooField = (index: number) => {
        setFormTabooWords((prev) => {
            if (prev.length > 1) {
                return prev.filter((_, i) => i !== index);
            }
            return prev;
        });
    };

    /* ─── Category toggle ────────────────────────────────────── */

    const toggleCategory = (catId: number) => {
        setFormCategoryIds((prev) =>
            prev.includes(catId)
                ? prev.filter((id) => id !== catId)
                : [...prev, catId]
        );
    };

    /* ─── Render ─────────────────────────────────────────────── */

    // Memoize flat categories to avoid recomputation on every render
    const flatCategories: { id: number; name: string; indent: boolean }[] = useMemo(() => {
        const result: { id: number; name: string; indent: boolean }[] = [];
        categories.forEach((cat) => {
            result.push({ id: cat.id, name: cat.name, indent: false });
            cat.children?.forEach((child) => {
                result.push({
                    id: child.id,
                    name: child.name,
                    indent: true,
                });
            });
        });
        return result;
    }, [categories]);

    return (
        <div className="space-y-5">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-purple-500" />
                        Kelime Yönetimi
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Toplam {total} kelime
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors active:scale-95"
                >
                    <Plus size={18} />
                    Yeni Kelime
                </button>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Kelime ara..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </div>
                <select
                    value={filterDifficulty}
                    onChange={(e) => {
                        setFilterDifficulty(e.target.value);
                        setPage(1);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                    <option value="">Tüm Zorluklar</option>
                    <option value="1">Kolay</option>
                    <option value="2">Orta</option>
                    <option value="3">Zor</option>
                </select>
            </div>

            {/* Words Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2
                            size={24}
                            className="animate-spin text-purple-500"
                        />
                    </div>
                ) : words.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <BookOpen
                            size={32}
                            className="mx-auto mb-3 opacity-30"
                        />
                        <p>Kelime bulunamadı.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400">
                                        Kelime
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400">
                                        Zorluk
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400">
                                        Yasaklı Kelimeler
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400">
                                        Kategoriler
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-500 dark:text-gray-400 w-24">
                                        İşlem
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {words.map((w) => (
                                    <tr
                                        key={w.id}
                                        className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">
                                            {w.wordText}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${difficultyColor[w.difficulty]}`}
                                            >
                                                {difficultyLabel[w.difficulty]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {w.tabooWords.map((t) => (
                                                    <span
                                                        key={t.id}
                                                        className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-md"
                                                    >
                                                        {t.tabooWordText}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {w.wordCategories.map(
                                                    ({ category: c }) => (
                                                        <span
                                                            key={c.id}
                                                            className="px-2 py-0.5 text-xs rounded-md font-medium"
                                                            style={{
                                                                backgroundColor: c.color
                                                                    ? `${c.color}20`
                                                                    : undefined,
                                                                color:
                                                                    c.color ||
                                                                    undefined,
                                                            }}
                                                        >
                                                            {c.name}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => openEdit(w)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    title="Düzenle"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(w.id)
                                                    }
                                                    disabled={
                                                        deleting === w.id
                                                    }
                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                                    title="Sil"
                                                >
                                                    {deleting === w.id ? (
                                                        <Loader2
                                                            size={15}
                                                            className="animate-spin"
                                                        />
                                                    ) : (
                                                        <Trash2 size={15} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm text-gray-500 font-medium">
                        {page} / {pages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                        disabled={page === pages}
                        className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* ─── Create / Edit Modal ───────────────────────── */}
            {formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editingWord
                                    ? "Kelime Düzenle"
                                    : "Yeni Kelime Ekle"}
                            </h3>
                            <button
                                onClick={() => setFormOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            {formError && (
                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium">
                                    {formError}
                                </div>
                            )}

                            {/* Word */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Ana Kelime
                                </label>
                                <input
                                    type="text"
                                    value={formWord}
                                    onChange={(e) =>
                                        setFormWord(e.target.value)
                                    }
                                    placeholder="Kelimeyi yazın..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>

                            {/* Difficulty */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Zorluk
                                </label>
                                <div className="flex gap-2">
                                    {[1, 2, 3].map((d) => (
                                        <button
                                            key={d}
                                            onClick={() =>
                                                setFormDifficulty(d)
                                            }
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${formDifficulty === d
                                                    ? d === 1
                                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                                        : d === 2
                                                            ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                                            : "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                                    : "border-gray-200 dark:border-slate-600 text-gray-400 hover:border-gray-300"
                                                }`}
                                        >
                                            {difficultyLabel[d]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Taboo Words */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Yasaklı Kelimeler
                                </label>
                                <div className="space-y-2">
                                    {formTabooWords.map((tw, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2"
                                        >
                                            <span className="text-xs font-bold text-gray-400 w-5 text-center">
                                                {i + 1}
                                            </span>
                                            <input
                                                type="text"
                                                value={tw}
                                                onChange={(e) =>
                                                    updateTaboo(
                                                        i,
                                                        e.target.value
                                                    )
                                                }
                                                placeholder={`Yasaklı kelime ${i + 1}`}
                                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                            />
                                            {formTabooWords.length > 1 && (
                                                <button
                                                    onClick={() =>
                                                        removeTabooField(i)
                                                    }
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {formTabooWords.length < 10 && (
                                        <button
                                            onClick={addTabooField}
                                            className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                                        >
                                            + Yasaklı kelime ekle
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Categories */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Kategoriler
                                </label>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-xl p-2 space-y-0.5">
                                    {flatCategories.map((cat) => (
                                        <label
                                            key={cat.id}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 ${cat.indent ? "ml-4" : "font-medium"}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formCategoryIds.includes(
                                                    cat.id
                                                )}
                                                onChange={() =>
                                                    toggleCategory(cat.id)
                                                }
                                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            />
                                            {cat.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
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
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {formSaving && (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                )}
                                {editingWord ? "Güncelle" : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
