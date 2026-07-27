"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FolderTree,
    Plus,
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    X,
    Loader2,
    ChevronDown,
    ChevronRight,
    Palette,
    GripVertical,
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
    id: number;
    name: string;
    parentId: number | null;
    color: string | null;
    sortOrder: number;
    isVisible: boolean;
    children: Category[];
    _count?: { wordCategories: number };
}

interface DeleteCandidate {
    id: number;
    name: string;
    parentId: number | null;
    childCount: number;
    wordCount: number;
}

interface SortableCategoryProps {
    category: Category;
    expanded: Set<number>;
    onCreateChild: (parentId: number) => void;
    onDelete: (category: DeleteCandidate) => void;
    onEdit: (category: Category) => void;
    onToggleExpand: (id: number) => void;
    onToggleVisibility: (category: Category) => void;
}

function SortableCategory({
    category,
    expanded,
    onCreateChild,
    onDelete,
    onEdit,
    onToggleExpand,
    onToggleVisibility,
}: SortableCategoryProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const hasChildren = category.children.length > 0;
    const isExpanded = expanded.has(category.id);

    return (
        <div ref={setNodeRef} style={style} className="relative">
            <div
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/60 dark:hover:bg-slate-700/30 ${
                    !category.isVisible ? "opacity-50" : ""
                }`}
            >
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab rounded p-1 text-gray-400 active:cursor-grabbing hover:text-gray-600 dark:hover:text-gray-300"
                    title="Sirayi degistir"
                >
                    <GripVertical size={16} />
                </button>

                <div
                    className="h-4 w-4 shrink-0 rounded-full border-2 border-white shadow-sm dark:border-slate-700"
                    style={{ backgroundColor: category.color || "#94a3b8" }}
                />

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-800 dark:text-white">
                            {category.name}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                            Ana kategori
                        </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>{category._count?.wordCategories ?? 0} kelime</span>
                        <span>{category.children.length} alt kategori</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onToggleVisibility(category)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
                        title={category.isVisible ? "Gizle" : "Gorunur yap"}
                    >
                        {category.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                        onClick={() => onCreateChild(category.id)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                        title="Alt kategori ekle"
                    >
                        <Plus size={15} />
                    </button>
                    <button
                        onClick={() => onEdit(category)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                        title="Duzenle"
                    >
                        <Pencil size={15} />
                    </button>
                    <button
                        onClick={() =>
                            onDelete({
                                id: category.id,
                                name: category.name,
                                parentId: category.parentId,
                                childCount: category.children.length,
                                wordCount: category._count?.wordCategories ?? 0,
                            })
                        }
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        title="Sil"
                    >
                        <Trash2 size={15} />
                    </button>
                    {hasChildren ? (
                        <button
                            onClick={() => onToggleExpand(category.id)}
                            className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                            title={isExpanded ? "Daralt" : "Genislet"}
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    ) : null}
                </div>
            </div>

            {hasChildren && isExpanded ? (
                <div className="ml-7 border-l-2 border-gray-100 dark:border-slate-700">
                    {category.children.map((child) => (
                        <div
                            key={child.id}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-700/30 ${
                                !child.isVisible ? "opacity-50" : ""
                            }`}
                        >
                            <div className="w-6" />
                            <div
                                className="h-4 w-4 shrink-0 rounded-full border-2 border-white shadow-sm dark:border-slate-700"
                                style={{ backgroundColor: child.color || "#94a3b8" }}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                                        {child.name}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                        Alt kategori
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                    {child._count?.wordCategories ?? 0} kelime
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onToggleVisibility(child)}
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
                                    title={child.isVisible ? "Gizle" : "Gorunur yap"}
                                >
                                    {child.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                                </button>
                                <button
                                    onClick={() => onEdit(child)}
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                                    title="Duzenle"
                                >
                                    <Pencil size={15} />
                                </button>
                                <button
                                    onClick={() =>
                                        onDelete({
                                            id: child.id,
                                            name: child.name,
                                            parentId: child.parentId,
                                            childCount: 0,
                                            wordCount: child._count?.wordCategories ?? 0,
                                        })
                                    }
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                    title="Sil"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState("");
    const [reorderSaving, setReorderSaving] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [formName, setFormName] = useState("");
    const [formColor, setFormColor] = useState("#6366f1");
    const [formParentId, setFormParentId] = useState<number | null>(null);
    const [formVisible, setFormVisible] = useState(true);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState<DeleteCandidate | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [deleteSaving, setDeleteSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/categories", { cache: "no-store" });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                setPageError((payload as { error?: string } | null)?.error ?? "Kategori listesi yuklenemedi.");
                return;
            }

            const nextCategories = (payload ?? []) as Category[];
            setCategories(nextCategories);
            setExpanded(new Set(nextCategories.map((category) => category.id)));
            setPageError("");
        } catch {
            setPageError("Kategori listesi yuklenirken ag hatasi olustu.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchCategories();
    }, [fetchCategories]);

    const rootCategoryOptions = useMemo(
        () => categories.map((category) => ({ id: category.id, name: category.name })),
        [categories]
    );

    const currentParentLabel = useMemo(() => {
        if (formParentId === null) {
            return null;
        }

        return categories.find((category) => category.id === formParentId)?.name ?? null;
    }, [categories, formParentId]);

    const totalCategories = useMemo(
        () => categories.reduce((sum, category) => sum + 1 + category.children.length, 0),
        [categories]
    );

    const totalSubcategories = useMemo(
        () => categories.reduce((sum, category) => sum + category.children.length, 0),
        [categories]
    );

    const flatCategoryOptions = useMemo(
        () =>
            categories.flatMap((category) => {
                const rootOption = {
                    id: category.id,
                    name: category.name,
                    parentId: category.parentId,
                    label: `${category.name} (Ana kategori)`,
                };

                const childOptions = category.children.map((child) => ({
                    id: child.id,
                    name: child.name,
                    parentId: child.parentId,
                    label: `${category.name} / ${child.name}`,
                }));

                return [rootOption, ...childOptions];
            }),
        [categories]
    );

    const deleteTargetOptions = useMemo(() => {
        if (!deleteCandidate) {
            return [];
        }

        return flatCategoryOptions.filter((category) => {
            if (category.id === deleteCandidate.id) {
                return false;
            }

            if (deleteCandidate.parentId === null) {
                return category.parentId === null;
            }

            return true;
        });
    }, [deleteCandidate, flatCategoryOptions]);

    const deleteRequiresMove = Boolean(
        deleteCandidate && (deleteCandidate.wordCount > 0 || deleteCandidate.childCount > 0)
    );

    const openCreate = useCallback((parentId: number | null = null) => {
        setEditing(null);
        setFormName("");
        setFormColor("#6366f1");
        setFormParentId(parentId);
        setFormVisible(true);
        setFormError("");
        setPageError("");
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((category: Category) => {
        setEditing(category);
        setFormName(category.name);
        setFormColor(category.color || "#6366f1");
        setFormParentId(category.parentId);
        setFormVisible(category.isVisible);
        setFormError("");
        setPageError("");
        setFormOpen(true);
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (reorderSaving || !over || active.id === over.id) {
            return;
        }

        const oldIndex = categories.findIndex((category) => category.id === active.id);
        const newIndex = categories.findIndex((category) => category.id === over.id);
        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const nextCategories = arrayMove(categories, oldIndex, newIndex);
        const updates = nextCategories.map((category, index) => ({
            id: category.id,
            sortOrder: index * 10,
        }));

        setCategories(
            nextCategories.map((category, index) => ({
                ...category,
                sortOrder: index * 10,
            }))
        );
        setReorderSaving(true);

        try {
            const response = await fetch("/api/admin/categories/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null) as { error?: string } | null;
                setPageError(payload?.error ?? "Kategori sirasi kaydedilemedi.");
                await fetchCategories();
                return;
            }

            setPageError("");
        } catch {
            setPageError("Kategori sirasi kaydedilirken ag hatasi olustu.");
            await fetchCategories();
        } finally {
            setReorderSaving(false);
        }
    }, [categories, fetchCategories, reorderSaving]);

    const handleSave = useCallback(async () => {
        if (!formName.trim()) {
            setFormError("Kategori adi bos olamaz.");
            return;
        }

        setFormSaving(true);
        setFormError("");

        try {
            const response = await fetch(
                editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories",
                {
                    method: editing ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formName.trim(),
                        color: formColor.trim() || null,
                        parentId: formParentId,
                        isVisible: formVisible,
                    }),
                }
            );

            const payload = await response.json().catch(() => null) as { error?: string } | null;
            if (!response.ok) {
                setFormError(payload?.error ?? "Kategori kaydedilemedi.");
                return;
            }

            setFormOpen(false);
            setPageError("");
            await fetchCategories();
        } catch {
            setFormError("Kategori kaydi sirasinda ag hatasi olustu.");
        } finally {
            setFormSaving(false);
        }
    }, [editing, fetchCategories, formColor, formName, formParentId, formVisible]);

    const handleDelete = useCallback(async () => {
        if (!deleteCandidate) {
            return;
        }

        setDeleteSaving(true);
        setDeleteError("");
        try {
            const response = deleteRequiresMove
                ? await fetch(`/api/admin/categories/${deleteCandidate.id}/move-delete`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ targetCategoryId: Number.parseInt(deleteTargetId, 10) }),
                })
                : await fetch(`/api/admin/categories/${deleteCandidate.id}`, {
                    method: "DELETE",
                });
            const payload = await response.json().catch(() => null) as { error?: string } | null;

            if (!response.ok) {
                const message = payload?.error ?? "Kategori silinemedi.";
                setDeleteError(message);
                setPageError(message);
                return;
            }

            setDeleteOpen(false);
            setDeleteCandidate(null);
            setDeleteTargetId("");
            setDeleteError("");
            setPageError("");
            await fetchCategories();
        } catch {
            const message = "Kategori silinirken ag hatasi olustu.";
            setDeleteError(message);
            setPageError(message);
        } finally {
            setDeleteSaving(false);
        }
    }, [deleteCandidate, deleteRequiresMove, deleteTargetId, fetchCategories]);

    const toggleVisibility = useCallback(async (category: Category) => {
        try {
            const response = await fetch(`/api/admin/categories/${category.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: !category.isVisible }),
            });
            const payload = await response.json().catch(() => null) as { error?: string } | null;

            if (!response.ok) {
                setPageError(payload?.error ?? "Gorunurluk guncellenemedi.");
                return;
            }

            setPageError("");
            await fetchCategories();
        } catch {
            setPageError("Gorunurluk guncellenirken ag hatasi olustu.");
        }
    }, [fetchCategories]);

    const toggleExpand = useCallback((categoryId: number) => {
        setExpanded((current) => {
            const next = new Set(current);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    }, []);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <FolderTree className="h-6 w-6 text-amber-500" />
                        Kategori Yonetimi
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Toplam {totalCategories} kategori. Ana kategoriler suruklenebilir, alt kategoriler kendi ana kategorisi altinda kalir.
                    </p>
                    {reorderSaving ? (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                            <Loader2 size={12} className="animate-spin" />
                            Siralama kaydediliyor
                        </div>
                    ) : null}
                </div>
                <button
                    onClick={() => openCreate(null)}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors active:scale-95 hover:bg-amber-600"
                >
                    <Plus size={18} />
                    Yeni Kategori
                </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-5 py-4 text-sm text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    <p className="font-semibold">Kategori politikasi</p>
                    <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
                        Ana kategori isterse genel kelime havuzu tasiyabilir. Daha spesifik havuzlar icin alt kategori ac.
                    </p>
                    <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
                        Ayni kelimeyi hem ana kategoriye hem de onun alt kategorisine birlikte baglamiyoruz. Kelime tarafinda bu kural zaten zorunlu.
                    </p>
                    <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
                        Su an taksonomi iki seviye: ana kategori ve alt kategori. Alt kategorinin altina yeni kategori acilamaz.
                    </p>
                    <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
                        Surukle-birak yalnizca ana kategoriler icindir. Alt kategoriler kendi ust kategorisinin altinda kalir.
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-white">Agac ozeti</p>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalCategories}</div>
                            <div className="mt-1 text-xs text-slate-500">toplam</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{categories.length}</div>
                            <div className="mt-1 text-xs text-slate-500">ana</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{totalSubcategories}</div>
                            <div className="mt-1 text-xs text-slate-500">alt</div>
                        </div>
                    </div>
                </div>
            </div>

            {pageError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {pageError}
                </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-amber-500" />
                    </div>
                ) : categories.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">
                        <FolderTree size={32} className="mx-auto mb-3 opacity-30" />
                        <p>Henuz kategori yok.</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={categories.map((category) => category.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {categories.map((category) => (
                                    <SortableCategory
                                        key={category.id}
                                        category={category}
                                        expanded={expanded}
                                        onCreateChild={openCreate}
                                        onDelete={(selectedCategory) => {
                                            setDeleteCandidate(selectedCategory);
                                            setDeleteTargetId("");
                                            setDeleteError("");
                                            setDeleteOpen(true);
                                        }}
                                        onEdit={openEdit}
                                        onToggleExpand={toggleExpand}
                                        onToggleVisibility={toggleVisibility}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {formOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editing ? "Kategoriyi Duzenle" : formParentId ? "Alt Kategori Ekle" : "Yeni Kategori"}
                            </h3>
                            <button
                                onClick={() => setFormOpen(false)}
                                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            {formError ? (
                                <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                    {formError}
                                </div>
                            ) : null}

                            {currentParentLabel ? (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    Bu kayit <span className="font-semibold">{currentParentLabel}</span> alt kategorisi olarak olusacak.
                                </div>
                            ) : null}

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-600 dark:text-gray-300">
                                    Kategori Adi
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(event) => setFormName(event.target.value)}
                                    placeholder="Kategori adi..."
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                    <Palette size={14} />
                                    Renk
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formColor}
                                        onChange={(event) => setFormColor(event.target.value)}
                                        className="h-10 w-10 cursor-pointer rounded-xl border-2 border-gray-200 dark:border-slate-600"
                                    />
                                    <input
                                        type="text"
                                        value={formColor}
                                        onChange={(event) => setFormColor(event.target.value)}
                                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900"
                                    />
                                </div>
                            </div>

                            {!editing?.parentId && !formParentId ? (
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-600 dark:text-gray-300">
                                        Ust Kategori (Opsiyonel)
                                    </label>
                                    <select
                                        value={formParentId ?? ""}
                                        onChange={(event) =>
                                            setFormParentId(event.target.value ? Number.parseInt(event.target.value, 10) : null)
                                        }
                                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        <option value="">Ana kategori (kok)</option>
                                        {rootCategoryOptions.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : null}

                            {!editing && formParentId === null ? (
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Ana kategoriye dogrudan kelime eklemek genel havuz anlamina gelir. Daha spesifik bir havuz gerekiyorsa alt kategori ac.
                                </p>
                            ) : null}

                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={formVisible}
                                    onChange={(event) => setFormVisible(event.target.checked)}
                                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    Oyuncular tarafindan gorunur
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-100 p-5 dark:border-slate-700">
                            <button
                                onClick={() => setFormOpen(false)}
                                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                Iptal
                            </button>
                            <button
                                onClick={() => void handleSave()}
                                disabled={formSaving}
                                className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors active:scale-95 hover:bg-amber-600 disabled:opacity-50"
                            >
                                {formSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                                {editing ? "Guncelle" : "Kaydet"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {deleteOpen && deleteCandidate ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Kategoriyi Sil</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {deleteCandidate.name}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setDeleteOpen(false);
                                    setDeleteCandidate(null);
                                    setDeleteTargetId("");
                                    setDeleteError("");
                                }}
                                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                                    <div className="text-xs text-slate-500">Bagli kelime</div>
                                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                                        {deleteCandidate.wordCount}
                                    </div>
                                </div>
                                <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                                    <div className="text-xs text-slate-500">Alt kategori</div>
                                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                                        {deleteCandidate.childCount}
                                    </div>
                                </div>
                            </div>

                            {deleteRequiresMove ? (
                                <div className="space-y-3">
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                                        Bu kategori bos degil. Silmeden once bagli kelimeler ve varsa alt kategoriler baska bir kategoriye tasinacak.
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-600 dark:text-gray-300">
                                            Hedef kategori
                                        </label>
                                        <select
                                            value={deleteTargetId}
                                            onChange={(event) => setDeleteTargetId(event.target.value)}
                                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900"
                                        >
                                            <option value="">Hedef kategori sec</option>
                                            {deleteTargetOptions.map((category) => (
                                                <option key={category.id} value={String(category.id)}>
                                                    {category.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                                    Bu kategori bos. Direkt silinecek.
                                </div>
                            )}

                            {deleteError ? (
                                <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                    {deleteError}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-100 p-5 dark:border-slate-700">
                            <button
                                onClick={() => {
                                    setDeleteOpen(false);
                                    setDeleteCandidate(null);
                                    setDeleteTargetId("");
                                    setDeleteError("");
                                }}
                                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                Vazgec
                            </button>
                            <button
                                onClick={() => void handleDelete()}
                                disabled={deleteSaving || (deleteRequiresMove && !deleteTargetId)}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors active:scale-95 hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleteSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                                {deleteRequiresMove ? "Tasiyip Sil" : "Sil"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
