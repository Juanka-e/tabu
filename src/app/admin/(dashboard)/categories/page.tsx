"use client";

import { useEffect, useState, useCallback } from "react";
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
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ─── Types ──────────────────────────────────────────────────── */

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

/* ─── Sortable Item Component ─────────────────────────────────── */

interface SortableCategoryProps {
    category: Category;
    isChild?: boolean;
    onToggleVisibility: (cat: Category) => void;
    onEdit: (cat: Category) => void;
    onDelete: (id: number) => void;
    onToggleExpand: (id: number) => void;
    expanded: Set<number>;
}

function SortableCategory({
    category,
    isChild = false,
    onToggleVisibility,
    onEdit,
    onDelete,
    onToggleExpand,
    expanded,
}: SortableCategoryProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: category.id,
        disabled: isChild, // Sadece ana kategorileri sırala
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expanded.has(category.id);
    const wordCount = category._count?.wordCategories ?? 0;

    return (
        <div ref={setNodeRef} style={style} className="relative">
            <div
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors ${!category.isVisible ? "opacity-50" : ""
                    } ${isChild ? "pl-12" : ""}`}
            >
                {/* Drag Handle - Sadece ana kategoriler için */}
                {!isChild && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical size={16} />
                    </button>
                )}

                {/* Color dot */}
                <div
                    className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                    style={{ backgroundColor: category.color || "#94a3b8" }}
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <span
                        className={`text-sm ${isChild
                            ? "text-gray-600 dark:text-gray-300"
                            : "font-bold text-slate-800 dark:text-white"
                            }`}
                    >
                        {category.name}
                    </span>
                    {wordCount > 0 && (
                        <span className="ml-2 text-xs text-gray-400">
                            ({wordCount} kelime)
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onToggleVisibility(category)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        title={category.isVisible ? "Gizle" : "Görünür Yap"}
                    >
                        {category.isVisible ? (
                            <Eye size={15} />
                        ) : (
                            <EyeOff size={15} />
                        )}
                    </button>
                    {!isChild && hasChildren && (
                        <button
                            onClick={() => onToggleExpand(category.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            {isExpanded ? (
                                <ChevronDown size={16} />
                            ) : (
                                <ChevronRight size={16} />
                            )}
                        </button>
                    )}
                    {!isChild && (
                        <button
                            onClick={() => onEdit(category)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Düzenle"
                        >
                            <Pencil size={15} />
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(category.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Sil"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Children - Not sortable */}
            {hasChildren && isExpanded && (
                <div className="border-l-2 border-gray-100 dark:border-slate-700 ml-7">
                    {category.children.map((child) => (
                        <div key={child.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                            <div className="flex items-center gap-3 px-4 py-3">
                                {/* Spacer for drag handle */}
                                <div className="w-6" />

                                <div
                                    className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                                    style={{
                                        backgroundColor:
                                            child.color || "#94a3b8",
                                    }}
                                />

                                <div className="flex-1 min-w-0">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        {child.name}
                                    </span>
                                    {child._count?.wordCategories && (
                                        <span className="ml-2 text-xs text-gray-400">
                                            ({child._count.wordCategories} kelime)
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() =>
                                            onToggleVisibility(child)
                                        }
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                        title={
                                            child.isVisible
                                                ? "Gizle"
                                                : "Görünür Yap"
                                        }
                                    >
                                        {child.isVisible ? (
                                            <Eye size={15} />
                                        ) : (
                                            <EyeOff size={15} />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => onEdit(child)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        title="Düzenle"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(child.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Sil"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Category | null>(null);
    const [formName, setFormName] = useState("");
    const [formColor, setFormColor] = useState("#6366f1");
    const [formParentId, setFormParentId] = useState<number | null>(null);
    const [formVisible, setFormVisible] = useState(true);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // Expanded groups
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    // Deleting
    // Deleting handled directly without state

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /* ─── Fetch ──────────────────────────────────────────────── */

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/categories");
            const data = await res.json();
            setCategories(data);
            // Auto-expand all
            const ids = new Set<number>();
            data.forEach((c: Category) => ids.add(c.id));
            setExpanded(ids);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    /* ─── Drag & Drop Handler ─────────────────────────────────── */

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = categories.findIndex((c) => c.id === active.id);
            const newIndex = categories.findIndex((c) => c.id === over.id);

            const newCategories = arrayMove(categories, oldIndex, newIndex);

            // Update sortOrder values based on new order
            const updates = newCategories.map((cat, index) => ({
                id: cat.id,
                sortOrder: index * 10, // 10, 20, 30...
            }));

            // Update local state immediately for responsiveness
            setCategories(
                newCategories.map((cat, index) => ({
                    ...cat,
                    sortOrder: index * 10,
                }))
            );

            // Save to backend
            try {
                await fetch("/api/admin/categories/reorder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ updates }),
                });
            } catch (error) {
                console.error("Failed to reorder categories:", error);
                fetchCategories(); // Revert on error
            }
        }
    };

    /* ─── Form Handlers ──────────────────────────────────────── */

    const openCreate = (parentId: number | null = null) => {
        setEditing(null);
        setFormName("");
        setFormColor("#6366f1");
        setFormParentId(parentId);
        setFormVisible(true);
        setFormError("");
        setFormOpen(true);
    };

    const openEdit = (cat: Category) => {
        setEditing(cat);
        setFormName(cat.name);
        setFormColor(cat.color || "#6366f1");
        setFormParentId(cat.parentId);
        setFormVisible(cat.isVisible);
        setFormError("");
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            setFormError("Kategori adı boş olamaz.");
            return;
        }

        setFormSaving(true);
        setFormError("");

        const body = {
            name: formName.trim(),
            color: formColor,
            parentId: formParentId,
            isVisible: formVisible,
        };

        try {
            const url = editing
                ? `/api/admin/categories/${editing.id}`
                : "/api/admin/categories";
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
            fetchCategories();
        } catch {
            setFormError("Ağ hatası.");
        } finally {
            setFormSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;
        try {
            await fetch(`/api/admin/categories/${id}`, {
                method: "DELETE",
            });
            fetchCategories();
        } catch {
            /* ignore */
        }
    };

    const toggleVisibility = async (cat: Category) => {
        try {
            await fetch(`/api/admin/categories/${cat.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isVisible: !cat.isVisible }),
            });
            fetchCategories();
        } catch {
            /* ignore */
        }
    };

    const toggleExpand = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    /* ─── Render ─────────────────────────────────────────────── */

    const totalCategories = categories.reduce(
        (sum, cat) => sum + 1 + (cat.children?.length || 0),
        0
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <FolderTree className="h-6 w-6 text-amber-500" />
                        Kategori Yönetimi
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Toplam {totalCategories} kategori • Sıralamayı değiştirmek için sürükleyin
                    </p>
                </div>
                <button
                    onClick={() => openCreate(null)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold shadow-md transition-colors active:scale-95"
                >
                    <Plus size={18} />
                    Yeni Kategori
                </button>
            </div>

            {/* Category Tree - Draggable */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2
                            size={24}
                            className="animate-spin text-amber-500"
                        />
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FolderTree
                            size={32}
                            className="mx-auto mb-3 opacity-30"
                        />
                        <p>Henüz kategori yok.</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={categories.map((c) => c.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {categories.map((cat) => (
                                    <SortableCategory
                                        key={cat.id}
                                        category={cat}
                                        onToggleVisibility={toggleVisibility}
                                        onEdit={openEdit}
                                        onDelete={handleDelete}
                                        onToggleExpand={toggleExpand}
                                        expanded={expanded}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* ─── Create / Edit Modal ───────────────────────── */}
            {formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editing
                                    ? "Kategoriyi Düzenle"
                                    : formParentId
                                        ? "Alt Kategori Ekle"
                                        : "Yeni Kategori"}
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

                            {/* Name */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                    Kategori Adı
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Kategori adı..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>

                            {/* Color */}
                            <div>
                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                    <Palette size={14} />
                                    Renk
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formColor}
                                        onChange={(e) =>
                                            setFormColor(e.target.value)
                                        }
                                        className="w-10 h-10 rounded-xl border-2 border-gray-200 dark:border-slate-600 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formColor}
                                        onChange={(e) =>
                                            setFormColor(e.target.value)
                                        }
                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Parent (for top-level only, disabled for children) */}
                            {!editing?.parentId && !formParentId && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block">
                                        Üst Kategori (Opsiyonel)
                                    </label>
                                    <select
                                        value={formParentId ?? ""}
                                        onChange={(e) =>
                                            setFormParentId(
                                                e.target.value
                                                    ? parseInt(e.target.value)
                                                    : null
                                            )
                                        }
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                    >
                                        <option value="">
                                            Ana Kategori (Kök)
                                        </option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Visibility */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formVisible}
                                    onChange={(e) =>
                                        setFormVisible(e.target.checked)
                                    }
                                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    Oyuncular tarafından görünür
                                </span>
                            </label>
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
                                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold shadow-md transition-colors active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {formSaving && (
                                    <Loader2 size={16} className="animate-spin" />
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
