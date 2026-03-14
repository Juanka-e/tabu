"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    Loader2,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableShell, AdminEmptyState } from "@/components/admin/admin-table-shell";
import { AdminToolbar, AdminToolbarStats } from "@/components/admin/admin-toolbar";

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
    children?: Array<{ id: number; name: string }>;
}

interface WordListResponse {
    words: Word[];
    total: number;
    page: number;
    pages: number;
}

type DifficultyValue = "1" | "2" | "3";

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

function buildEmptyTabooFields(): string[] {
    return ["", "", "", "", ""];
}

export default function AdminWordsPage() {
    const [words, setWords] = useState<Word[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState("");
    const [filterDifficulty, setFilterDifficulty] = useState<"" | DifficultyValue>("");
    const [filterCategoryId, setFilterCategoryId] = useState("");
    const [loading, setLoading] = useState(true);

    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    const [formOpen, setFormOpen] = useState(false);
    const [editingWord, setEditingWord] = useState<Word | null>(null);
    const [formWord, setFormWord] = useState("");
    const [formDifficulty, setFormDifficulty] = useState<number>(1);
    const [formTabooWords, setFormTabooWords] = useState<string[]>(buildEmptyTabooFields);
    const [formCategoryIds, setFormCategoryIds] = useState<number[]>([]);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const flatCategories = useMemo(() => {
        const result: Array<{ id: number; name: string; indent: boolean }> = [];
        for (const category of categories) {
            result.push({ id: category.id, name: category.name, indent: false });
            for (const child of category.children ?? []) {
                result.push({ id: child.id, name: child.name, indent: true });
            }
        }
        return result;
    }, [categories]);

    const fetchWords = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(page),
            limit: "15",
        });
        if (search.trim()) {
            params.set("search", search.trim());
        }
        if (filterDifficulty) {
            params.set("difficulty", filterDifficulty);
        }
        if (filterCategoryId) {
            params.set("categoryId", filterCategoryId);
        }

        try {
            const response = await fetch(`/api/admin/words?${params.toString()}`, {
                cache: "no-store",
            });
            if (!response.ok) {
                toast.error("Kelime listesi yuklenemedi.");
                return;
            }

            const payload = (await response.json()) as WordListResponse;
            setWords(payload.words);
            setTotal(payload.total);
            setPages(payload.pages);
            setPage(payload.page);
        } catch {
            toast.error("Kelime listesi yuklenemedi.");
        } finally {
            setLoading(false);
        }
    }, [filterCategoryId, filterDifficulty, page, search]);

    const fetchCategories = useCallback(async () => {
        setCategoriesLoading(true);
        try {
            const response = await fetch("/api/admin/categories", { cache: "no-store" });
            if (!response.ok) {
                return;
            }
            const payload = (await response.json()) as CategoryOption[];
            setCategories(payload);
        } catch {
            // Keep the last successful category list.
        } finally {
            setCategoriesLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchWords();
    }, [fetchWords]);

    useEffect(() => {
        void fetchCategories();
    }, [fetchCategories]);

    const resetForm = useCallback(() => {
        setEditingWord(null);
        setFormWord("");
        setFormDifficulty(1);
        setFormTabooWords(buildEmptyTabooFields());
        setFormCategoryIds([]);
        setFormError("");
    }, []);

    const openCreate = useCallback(() => {
        resetForm();
        setFormOpen(true);
    }, [resetForm]);

    const openEdit = useCallback((word: Word) => {
        setEditingWord(word);
        setFormWord(word.wordText);
        setFormDifficulty(word.difficulty);
        const tabooWords = [...word.tabooWords.map((item) => item.tabooWordText)];
        while (tabooWords.length < 5) {
            tabooWords.push("");
        }
        setFormTabooWords(tabooWords);
        setFormCategoryIds(word.wordCategories.map((entry) => entry.category.id));
        setFormError("");
        setFormOpen(true);
    }, []);

    const updateTabooWord = useCallback((index: number, value: string) => {
        setFormTabooWords((current) => {
            const next = [...current];
            next[index] = value;
            return next;
        });
    }, []);

    const toggleCategory = useCallback((categoryId: number) => {
        setFormCategoryIds((current) =>
            current.includes(categoryId)
                ? current.filter((itemId) => itemId !== categoryId)
                : [...current, categoryId]
        );
    }, []);

    const handleSave = useCallback(async () => {
        const cleanedTaboos = formTabooWords
            .map((value) => value.trim())
            .filter((value) => value.length > 0);

        if (!formWord.trim()) {
            setFormError("Kelime bos olamaz.");
            return;
        }

        if (cleanedTaboos.length === 0) {
            setFormError("En az bir yasakli kelime gerekli.");
            return;
        }

        setFormSaving(true);
        setFormError("");

        try {
            const response = await fetch(
                editingWord ? `/api/admin/words/${editingWord.id}` : "/api/admin/words",
                {
                    method: editingWord ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        wordText: formWord.trim(),
                        difficulty: formDifficulty,
                        tabooWords: cleanedTaboos,
                        categoryIds: formCategoryIds,
                    }),
                }
            );

            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({
                    error: "Kelime kaydedilemedi.",
                }))) as { error?: string };
                setFormError(errorPayload.error ?? "Kelime kaydedilemedi.");
                return;
            }

            setFormOpen(false);
            resetForm();
            toast.success(editingWord ? "Kelime guncellendi." : "Kelime olusturuldu.");
            await fetchWords();
        } catch {
            setFormError("Ag hatasi olustu.");
        } finally {
            setFormSaving(false);
        }
    }, [
        editingWord,
        fetchWords,
        formCategoryIds,
        formDifficulty,
        formTabooWords,
        formWord,
        resetForm,
    ]);

    const handleDelete = useCallback(async (word: Word) => {
        if (!window.confirm(`"${word.wordText}" kaydini silmek istediginize emin misiniz?`)) {
            return;
        }

        setDeletingId(word.id);
        try {
            const response = await fetch(`/api/admin/words/${word.id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                toast.error("Kelime silinemedi.");
                return;
            }

            toast.success("Kelime silindi.");
            await fetchWords();
        } catch {
            toast.error("Kelime silinemedi.");
        } finally {
            setDeletingId(null);
        }
    }, [fetchWords]);

    const activeFilterCount = Number(Boolean(search.trim()))
        + Number(Boolean(filterDifficulty))
        + Number(Boolean(filterCategoryId));

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Kelime Yonetimi"
                description="Kelime havuzunu arama, filtreleme ve hizli duzenleme akislariyla yonetin."
                meta={`${total} kayit`}
                icon={<BookOpen className="h-5 w-5 text-sky-500" />}
                action={
                    <Button onClick={openCreate} className="gap-2">
                        <Plus size={16} />
                        Yeni Kelime
                    </Button>
                }
            />

            <AdminToolbar>
                <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_240px]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Kelime ara..."
                            className="pl-9"
                        />
                    </div>
                    <select
                        value={filterDifficulty}
                        onChange={(event) => {
                            const value = event.target.value as "" | DifficultyValue;
                            setFilterDifficulty(value);
                            setPage(1);
                        }}
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                    >
                        <option value="">Tum zorluklar</option>
                        <option value="1">Kolay</option>
                        <option value="2">Orta</option>
                        <option value="3">Zor</option>
                    </select>
                    <select
                        value={filterCategoryId}
                        onChange={(event) => {
                            setFilterCategoryId(event.target.value);
                            setPage(1);
                        }}
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                        disabled={categoriesLoading}
                    >
                        <option value="">Tum kategoriler</option>
                        {flatCategories.map((category) => (
                            <option key={category.id} value={String(category.id)}>
                                {category.indent ? `- ${category.name}` : category.name}
                            </option>
                        ))}
                    </select>
                </div>
                <AdminToolbarStats
                    stats={[
                        { label: "sayfa", value: `${page} / ${pages}` },
                        { label: "filtre", value: String(activeFilterCount) },
                    ]}
                />
            </AdminToolbar>

            <AdminTableShell
                title="Kelime Kayitlari"
                description="Liste server-side olarak filtrelenir ve sayfalanir."
                loading={loading}
                isEmpty={!loading && words.length === 0}
                emptyState={
                    <AdminEmptyState
                        icon={<BookOpen className="h-6 w-6" />}
                        title="Kelime bulunamadi"
                        description="Arama veya filtre sonucunda gosterilecek kayit yok."
                    />
                }
                footer={
                    <AdminPagination
                        page={page}
                        pageCount={pages}
                        onPageChange={setPage}
                    />
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/20">
                            <TableHead>Kelime</TableHead>
                            <TableHead>Zorluk</TableHead>
                            <TableHead>Yasakli Kelimeler</TableHead>
                            <TableHead>Kategoriler</TableHead>
                            <TableHead className="text-right">Islem</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {words.map((word) => (
                            <TableRow key={word.id}>
                                <TableCell className="font-semibold text-foreground">
                                    {word.wordText}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${difficultyColor[word.difficulty]}`}
                                    >
                                        {difficultyLabel[word.difficulty]}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1.5">
                                        {word.tabooWords.map((taboo) => (
                                            <span
                                                key={taboo.id}
                                                className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                            >
                                                {taboo.tabooWordText}
                                            </span>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1.5">
                                        {word.wordCategories.map(({ category }) => (
                                            <span
                                                key={category.id}
                                                className="rounded-full px-2 py-0.5 text-xs font-medium"
                                                style={{
                                                    backgroundColor: category.color
                                                        ? `${category.color}20`
                                                        : undefined,
                                                    color: category.color ?? undefined,
                                                }}
                                            >
                                                {category.name}
                                            </span>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEdit(word)}
                                        >
                                            <Pencil size={15} />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => void handleDelete(word)}
                                            disabled={deletingId === word.id}
                                        >
                                            {deletingId === word.id ? (
                                                <Loader2 size={15} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={15} />
                                            )}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </AdminTableShell>

            {formOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
                        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    {editingWord ? "Kelime duzenle" : "Yeni kelime"}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Kelime, zorluk, yasakli kelime ve kategori alanlarini tek formda yonet.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setFormOpen(false);
                                    resetForm();
                                }}
                            >
                                <X size={18} />
                            </Button>
                        </div>

                        <div className="space-y-5 p-5">
                            {formError ? (
                                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                                    {formError}
                                </div>
                            ) : null}

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                    Ana kelime
                                </label>
                                <Input
                                    value={formWord}
                                    onChange={(event) => setFormWord(event.target.value)}
                                    placeholder="Kelimeyi yazin..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                    Zorluk
                                </label>
                                <div className="grid gap-2 md:grid-cols-3">
                                    {[1, 2, 3].map((difficulty) => (
                                        <button
                                            key={difficulty}
                                            type="button"
                                            onClick={() => setFormDifficulty(difficulty)}
                                            className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                                formDifficulty === difficulty
                                                    ? "border-sky-500 bg-sky-500/10 text-foreground"
                                                    : "border-border bg-background text-muted-foreground hover:border-sky-300"
                                            }`}
                                        >
                                            {difficultyLabel[difficulty]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                        Yasakli kelimeler
                                    </label>
                                    {formTabooWords.length < 10 ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setFormTabooWords((current) => [...current, ""])
                                            }
                                        >
                                            Alan ekle
                                        </Button>
                                    ) : null}
                                </div>
                                <div className="grid gap-2">
                                    {formTabooWords.map((tabooWord, index) => (
                                        <div key={`taboo-${index}`} className="flex gap-2">
                                            <Input
                                                value={tabooWord}
                                                onChange={(event) =>
                                                    updateTabooWord(index, event.target.value)
                                                }
                                                placeholder={`Yasakli kelime ${index + 1}`}
                                            />
                                            {formTabooWords.length > 1 ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        setFormTabooWords((current) =>
                                                            current.filter((_, itemIndex) => itemIndex !== index)
                                                        )
                                                    }
                                                >
                                                    <X size={14} />
                                                </Button>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                    Kategoriler
                                </label>
                                <div className="grid max-h-52 gap-2 overflow-y-auto rounded-2xl border border-border bg-muted/20 p-3 md:grid-cols-2">
                                    {flatCategories.map((category) => (
                                        <label
                                            key={category.id}
                                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                                                category.indent
                                                    ? "pl-6 text-muted-foreground"
                                                    : "font-medium text-foreground"
                                            } hover:bg-background/70`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formCategoryIds.includes(category.id)}
                                                onChange={() => toggleCategory(category.id)}
                                                className="h-4 w-4 rounded border-border"
                                            />
                                            <span>{category.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setFormOpen(false);
                                    resetForm();
                                }}
                            >
                                Iptal
                            </Button>
                            <Button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={formSaving}
                                className="gap-2"
                            >
                                {formSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                                {editingWord ? "Guncelle" : "Kaydet"}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
