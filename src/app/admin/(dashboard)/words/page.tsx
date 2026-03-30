"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    FileUp,
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
import { AdminSelectionBar } from "@/components/admin/admin-selection-bar";
import { AdminTableShell, AdminEmptyState } from "@/components/admin/admin-table-shell";
import { AdminToolbar, AdminToolbarStats } from "@/components/admin/admin-toolbar";
import { useAdminSelection } from "@/hooks/use-admin-selection";

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
type BulkUploadMode = "fixed_categories" | "csv_categories";

interface BulkUploadReport {
    success: number;
    skipped: number;
    errors: string[];
    skippedRows: string[];
}

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
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [bulkMode, setBulkMode] = useState<BulkUploadMode>("csv_categories");
    const [bulkCategoryId, setBulkCategoryId] = useState("");
    const [bulkSubcategoryId, setBulkSubcategoryId] = useState("");
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkError, setBulkError] = useState("");
    const [bulkReport, setBulkReport] = useState<BulkUploadReport | null>(null);

    const rootCategories = useMemo(() => categories, [categories]);
    const selectedSubcategories = useMemo(() => {
        const selected = categories.find((category) => String(category.id) === bulkCategoryId);
        return selected?.children ?? [];
    }, [bulkCategoryId, categories]);

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

    const visibleWordIds = useMemo(() => words.map((word) => word.id), [words]);
    const {
        allSelected,
        clearSelection,
        selectedCount,
        selectedIds,
        toggleAll,
        toggleOne,
    } = useAdminSelection(visibleWordIds);

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

    useEffect(() => {
        clearSelection();
    }, [clearSelection, words]);

    const handleBulkDelete = useCallback(async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) {
            return;
        }

        if (!window.confirm(`${ids.length} kelime kaydini silmek istedigine emin misin?`)) {
            return;
        }

        setBulkDeleting(true);
        try {
            const response = await fetch("/api/admin/words/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });

            if (!response.ok) {
                toast.error("Secili kelimeler silinemedi.");
                return;
            }

            const payload = (await response.json().catch(() => null)) as { deletedCount?: number } | null;
            toast.success(`${payload?.deletedCount ?? ids.length} kelime silindi.`);
            clearSelection();
            await fetchWords();
        } catch {
            toast.error("Secili kelimeler silinemedi.");
        } finally {
            setBulkDeleting(false);
        }
    }, [clearSelection, fetchWords, selectedIds]);

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Kelime Yonetimi"
                description="Kelime havuzunu arama, filtreleme ve hizli duzenleme akislariyla yonetin."
                meta={`${total} kayit`}
                icon={<BookOpen className="h-5 w-5 text-sky-500" />}
                action={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
                            <FileUp size={16} />
                            Toplu Yukle
                        </Button>
                        <Button onClick={openCreate} className="gap-2">
                            <Plus size={16} />
                            Yeni Kelime
                        </Button>
                    </div>
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

            <AdminSelectionBar selectedCount={selectedCount} onClear={clearSelection}>
                <span className="text-xs text-muted-foreground">
                    Yalnız bu sayfadaki görünen kayıtlar seçilir.
                </span>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={bulkDeleting}
                    onClick={() => void handleBulkDelete()}
                    className="gap-2"
                >
                    {bulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Seçilileri Sil
                </Button>
            </AdminSelectionBar>

            <AdminTableShell
                title="Kelime Kayitlari"
                description="Liste server-side olarak filtrelenir ve sayfalanır. Seçim yalnız görünen sayfadaki kayıtları kapsar."
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
                            <TableHead className="w-10 text-center">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={() => toggleAll()}
                                    aria-label="Tum gorunen kelimeleri sec"
                                    className="h-4 w-4 rounded border-border"
                                />
                            </TableHead>
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
                                <TableCell className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(word.id)}
                                        onChange={() => toggleOne(word.id)}
                                        aria-label={`${word.wordText} sec`}
                                        className="h-4 w-4 rounded border-border"
                                    />
                                </TableCell>
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

            {bulkOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Toplu kelime yukle</h2>
                                <p className="text-sm text-muted-foreground">
                                    CSV dosyasini yÃ¼kle. Ä°stersen her satÄ±r kendi kategori bilgisini taÅŸÄ±sÄ±n, istersen tÃ¼m satÄ±rlara ortak kategori uygula.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setBulkOpen(false);
                                    setBulkFile(null);
                                    setBulkMode("csv_categories");
                                    setBulkCategoryId("");
                                    setBulkSubcategoryId("");
                                    setBulkError("");
                                    setBulkReport(null);
                                }}
                            >
                                <X size={18} />
                            </Button>
                        </div>

                        <div className="space-y-5 p-5">
                            {bulkError ? (
                                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                                    {bulkError}
                                </div>
                            ) : null}

                            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={bulkMode === "csv_categories" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                            setBulkMode("csv_categories");
                                            setBulkCategoryId("");
                                            setBulkSubcategoryId("");
                                            setBulkReport(null);
                                        }}
                                    >
                                        CSV Kategorisi
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={bulkMode === "fixed_categories" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                            setBulkMode("fixed_categories");
                                            setBulkReport(null);
                                        }}
                                    >
                                        Ortak Kategori Ata
                                    </Button>
                                </div>
                                <div className="mt-3 rounded-xl bg-background px-3 py-2 font-mono text-xs text-foreground">
                                    {bulkMode === "csv_categories"
                                        ? "kelime,zorluk,kategori,alt_kategori,yasak1,yasak2,yasak3,yasak4,yasak5"
                                        : "kelime,zorluk,yasak1,yasak2,yasak3,yasak4,yasak5"}
                                </div>
                                <p className="mt-2">
                                    {bulkMode === "csv_categories"
                                        ? "FarklÄ± kategorilerde Ã§ok sayÄ±da kelime yÃ¼klemek iÃ§in kategori ve alt kategori adlarÄ±nÄ± CSV iÃ§inde ver."
                                        : "TÃ¼m satÄ±rlara aynÄ± kategori veya alt kategori atanacaksa bu modu kullan."}
                                </p>
                                <p className="mt-2 text-xs">
                                    {bulkMode === "csv_categories"
                                        ? "Alt kategori yoksa alt_kategori sÃ¼tununu boÅŸ bÄ±rak. Kategori ve alt kategori adlarÄ± sistemde zaten var olmalÄ±."
                                        : "Bu modda CSV iÃ§inden kategori okunmaz. SeÃ§tiÄŸin kategori ve varsa alt kategori tÃ¼m satÄ±rlara uygulanÄ±r."}
                                </p>
                                <p className="mt-2 text-xs">
                                    Kategori taksonomisi bulk upload sÄ±rasÄ±nda otomatik aÃ§Ä±lmaz. Yeni kategori gerekiyorsa Ã¶nce kategori yÃ¶netiminden oluÅŸtur.
                                </p>
                                <div className="mt-3 rounded-xl border border-border/70 bg-card px-3 py-3 text-xs text-muted-foreground">
                                    <p className="font-semibold text-foreground">Ã–rnek</p>
                                    <div className="mt-2 space-y-1 font-mono">
                                        {bulkMode === "csv_categories" ? (
                                            <>
                                                <div>marti,1,Hayvanlar,,kanat,deniz,ucmak</div>
                                                <div>levrek,2,Yiyecek,Deniz Urunleri,balik,izgara,kilcik</div>
                                            </>
                                        ) : (
                                            <div>marti,1,kanat,deniz,ucmak</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                    CSV dosyasi
                                </label>
                                <Input
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
                                />
                            </div>

                            <div className={`grid gap-4 md:grid-cols-2 ${bulkMode !== "fixed_categories" ? "opacity-60" : ""}`}>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                        Kategori
                                    </label>
                                    <select
                                        value={bulkCategoryId}
                                        onChange={(event) => {
                                            setBulkCategoryId(event.target.value);
                                            setBulkSubcategoryId("");
                                        }}
                                        disabled={bulkMode !== "fixed_categories"}
                                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                                    >
                                        <option value="">Kategori atama</option>
                                        {rootCategories.map((category) => (
                                            <option key={category.id} value={String(category.id)}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                        Alt kategori
                                    </label>
                                    <select
                                        value={bulkSubcategoryId}
                                        onChange={(event) => setBulkSubcategoryId(event.target.value)}
                                        disabled={
                                            bulkMode !== "fixed_categories"
                                            || !bulkCategoryId
                                            || selectedSubcategories.length === 0
                                        }
                                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <option value="">Alt kategori atama</option>
                                        {selectedSubcategories.map((category) => (
                                            <option key={category.id} value={String(category.id)}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {bulkReport ? (
                                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3">
                                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                                                Eklendi
                                            </div>
                                            <div className="mt-1 text-2xl font-black text-foreground">{bulkReport.success}</div>
                                        </div>
                                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3">
                                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                                                AtlandÄ±
                                            </div>
                                            <div className="mt-1 text-2xl font-black text-foreground">{bulkReport.skipped}</div>
                                        </div>
                                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3">
                                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-red-700 dark:text-red-300">
                                                Hata
                                            </div>
                                            <div className="mt-1 text-2xl font-black text-foreground">{bulkReport.errors.length}</div>
                                        </div>
                                    </div>

                                    {bulkReport.skippedRows.length > 0 ? (
                                        <div className="mt-4">
                                            <h3 className="text-sm font-semibold text-foreground">Atlanan satÄ±rlar</h3>
                                            <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
                                                <ul className="space-y-1">
                                                    {bulkReport.skippedRows.map((item) => (
                                                        <li key={item}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ) : null}

                                    {bulkReport.errors.length > 0 ? (
                                        <div className="mt-4">
                                            <h3 className="text-sm font-semibold text-foreground">HatalÄ± satÄ±rlar</h3>
                                            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-red-500/20 bg-background px-3 py-3 text-sm text-red-600 dark:text-red-300">
                                                <ul className="space-y-1">
                                                    {bulkReport.errors.map((item) => (
                                                        <li key={item}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setBulkOpen(false);
                                    setBulkFile(null);
                                    setBulkMode("csv_categories");
                                    setBulkCategoryId("");
                                    setBulkSubcategoryId("");
                                    setBulkError("");
                                    setBulkReport(null);
                                }}
                            >
                                Iptal
                            </Button>
                            <Button
                                type="button"
                                onClick={async () => {
                                    if (!bulkFile) {
                                        setBulkError("Once bir CSV dosyasi sec.");
                                        return;
                                    }

                                    setBulkSaving(true);
                                    setBulkError("");
                                    setBulkReport(null);

                                    try {
                                        const formData = new FormData();
                                        formData.append("file", bulkFile);
                                        formData.append("mode", bulkMode);
                                        if (bulkMode === "fixed_categories" && bulkCategoryId) {
                                            formData.append("categoryId", bulkCategoryId);
                                        }
                                        if (bulkMode === "fixed_categories" && bulkSubcategoryId) {
                                            formData.append("subcategoryId", bulkSubcategoryId);
                                        }

                                        const response = await fetch("/api/admin/words/bulk-upload", {
                                            method: "POST",
                                            body: formData,
                                        });
                                        const payload = await response.json().catch(() => null) as
                                            | {
                                                error?: string;
                                                success?: number;
                                                skipped?: number;
                                                errors?: string[];
                                                skippedRows?: string[];
                                            }
                                            | null;

                                        if (!response.ok) {
                                            setBulkError(payload?.error ?? "Toplu yukleme basarisiz oldu.");
                                            return;
                                        }

                                        const errorCount = payload?.errors?.length ?? 0;
                                        const skippedCount = payload?.skipped ?? 0;
                                        const nextReport: BulkUploadReport = {
                                            success: payload?.success ?? 0,
                                            skipped: skippedCount,
                                            errors: payload?.errors ?? [],
                                            skippedRows: payload?.skippedRows ?? [],
                                        };
                                        toast.success(
                                            `${nextReport.success} kelime eklendi, ${skippedCount} kayÄ±t atlandÄ±${errorCount ? `, ${errorCount} hata var` : ""}.`
                                        );
                                        await fetchWords();
                                        if (nextReport.errors.length > 0 || nextReport.skippedRows.length > 0) {
                                            setBulkReport(nextReport);
                                            return;
                                        }

                                        setBulkOpen(false);
                                        setBulkFile(null);
                                        setBulkMode("csv_categories");
                                        setBulkCategoryId("");
                                        setBulkSubcategoryId("");
                                        setBulkError("");
                                        setBulkReport(null);
                                    } catch {
                                        setBulkError("Ag hatasi olustu.");
                                    } finally {
                                        setBulkSaving(false);
                                    }
                                }}
                                disabled={bulkSaving}
                                className="gap-2"
                            >
                                {bulkSaving ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                                Yuklemeyi Baslat
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}


