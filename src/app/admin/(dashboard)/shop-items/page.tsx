"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CosmeticLivePreview } from "@/components/admin/cosmetic-live-preview";
import { ShopOrderBoard } from "@/components/admin/shop-order-board";
import {
    Edit2,
    FileJson2,
    Eye,
    EyeOff,
    Image as ImageIcon,
    Plus,
    Save,
    Search,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import type { TemplateConfig } from "@/types/economy";
import {
    ADMIN_RARITY_BADGE_CLASS,
} from "@/lib/store/shop-admin";

type ItemType = "avatar" | "frame" | "card_back" | "card_face";
type Rarity = "common" | "rare" | "epic" | "legendary";
type RenderMode = "image" | "template";

interface ShopItem {
    id: number;
    code: string;
    type: ItemType;
    name: string;
    rarity: Rarity;
    renderMode: RenderMode;
    priceCoin: number;
    imageUrl: string;
    templateKey: string | null;
    templateConfig: TemplateConfig | null;
    badgeText: string | null;
    isFeatured: boolean;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    _count?: { inventoryItems: number; purchases: number };
}

interface ShopItemFormState {
    code: string;
    type: ItemType;
    name: string;
    rarity: Rarity;
    renderMode: RenderMode;
    priceCoin: number;
    imageUrl: string;
    templateKey: string;
    templateConfigText: string;
    badgeText: string;
    isFeatured: boolean;
    isActive: boolean;
    sortOrder: number;
}

const typeLabels: Record<ItemType, string> = {
    avatar: "Avatar",
    frame: "Cerceve",
    card_back: "Kart Arkasi",
    card_face: "Kart Onu",
};

const emptyItem: ShopItemFormState = {
    code: "",
    type: "avatar",
    name: "",
    rarity: "common",
    renderMode: "image",
    priceCoin: 100,
    imageUrl: "",
    templateKey: "",
    templateConfigText: "",
    badgeText: "",
    isFeatured: false,
    isActive: true,
    sortOrder: 0,
};

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

function stringifyTemplateConfig(config: TemplateConfig | null): string {
    return config ? JSON.stringify(config, null, 2) : "";
}

function mapUploadCategory(type: ItemType): string {
    if (type === "card_back") {
        return "card-backs";
    }
    if (type === "card_face") {
        return "card-faces";
    }
    return `${type}s`;
}

function parseTemplateConfig(templateConfigText: string): TemplateConfig | null {
    const trimmed = templateConfigText.trim();
    if (!trimmed) {
        return null;
    }

    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Template config must be a JSON object.");
    }

    const normalized = normalizeTemplateObject(parsed as Record<string, unknown>, 0);
    return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeTemplateObject(input: Record<string, unknown>, depth: number): TemplateConfig {
    if (depth > 3) {
        throw new Error("Template config supports up to 3 nested levels.");
    }

    const normalizedEntries: [string, TemplateConfig[keyof TemplateConfig]][] = [];

    for (const [key, value] of Object.entries(input)) {
        if (!key.trim()) {
            continue;
        }

        if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            normalizedEntries.push([key, value]);
            continue;
        }

        if (Array.isArray(value)) {
            if (!value.every((entry) => entry === null || typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean")) {
                throw new Error("Template config arrays can only contain string, number, boolean or null values.");
            }
            normalizedEntries.push([key, value]);
            continue;
        }

        if (typeof value === "object") {
            const nestedObject = value as Record<string, unknown>;
            normalizedEntries.push([key, normalizeTemplateObject(nestedObject, depth + 1)]);
            continue;
        }

        throw new Error("Unsupported template config value.");
    }

    return Object.fromEntries(normalizedEntries);
}

function getTemplateExample(type: ItemType): string {
    if (type === "frame") {
        return JSON.stringify(
            {
                palette: {
                    primary: "#22c55e",
                    secondary: "#bbf7d0",
                },
                pattern: {
                    type: "rings",
                    opacity: 0.22,
                    scale: 14,
                },
                glow: {
                    color: "#4ade80",
                    blur: 24,
                    opacity: 0.24,
                },
                frame: {
                    style: "ornate",
                    thickness: 3,
                    radius: 20,
                },
                motion: {
                    preset: "pulse",
                    speedMs: 4200,
                },
            },
            null,
            2
        );
    }

    if (type === "card_back") {
        return JSON.stringify(
            {
                palette: {
                    surface: "#111827",
                    border: "#38bdf8",
                    primary: "#22d3ee",
                    secondary: "#93c5fd",
                    title: "#f8fafc",
                    detail: "#cbd5e1",
                },
                pattern: {
                    type: "chevrons",
                    opacity: 0.2,
                    scale: 18,
                },
                glow: {
                    color: "#38bdf8",
                    blur: 30,
                    opacity: 0.22,
                },
                motion: {
                    preset: "drift",
                    speedMs: 6200,
                },
            },
            null,
            2
        );
    }

    return JSON.stringify(
        {
            palette: {
                primary: "#8b5cf6",
                secondary: "#ddd6fe",
                surface: "#1e1b4b",
                border: "#c4b5fd",
                word: "#ffffff",
                taboo: "#fda4af",
                footer: "#ede9fe",
            },
            pattern: {
                type: "noise",
                opacity: 0.18,
                scale: 16,
            },
            glow: {
                color: "#a855f7",
                blur: 28,
                opacity: 0.2,
            },
            motion: {
                preset: "shimmer",
                speedMs: 3400,
            },
        },
        null,
        2
    );
}

export default function ShopItemsPage() {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<ItemType | "">("");
    const [filterRarity, setFilterRarity] = useState<Rarity | "">("");
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [form, setForm] = useState<ShopItemFormState>(emptyItem);
    const [saving, setSaving] = useState(false);
    const [reorderSaving, setReorderSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/shop-items", { cache: "no-store" });
            if (!response.ok) {
                return;
            }

            const payload = (await response.json()) as ShopItem[];
            setItems(payload);
        } catch {
            // Keep previous list on failure.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadItems();
    }, [loadItems]);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (filterType && item.type !== filterType) {
                return false;
            }
            if (filterRarity && item.rarity !== filterRarity) {
                return false;
            }
            if (
                search &&
                !item.name.toLowerCase().includes(search.toLowerCase()) &&
                !item.code.toLowerCase().includes(search.toLowerCase())
            ) {
                return false;
            }
            return true;
        });
    }, [filterRarity, filterType, items, search]);

    const handleReorder = async (
        updates: Array<{ id: number; sortOrder: number }>
    ) => {
        const nextSortMap = new Map(
            updates.map((entry) => [entry.id, entry.sortOrder] as const)
        );

        setItems((current) =>
            current.map((item) => ({
                ...item,
                sortOrder: nextSortMap.get(item.id) ?? item.sortOrder,
            }))
        );
        setReorderSaving(true);

        try {
            const response = await fetch("/api/admin/shop-items/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });

            if (!response.ok) {
                await loadItems();
            }
        } catch {
            await loadItems();
        } finally {
            setReorderSaving(false);
        }
    };

    const openCreate = () => {
        setEditingItem(null);
        setForm(emptyItem);
        setShowModal(true);
    };

    const openEdit = (item: ShopItem) => {
        setEditingItem(item);
        setForm({
            code: item.code,
            type: item.type,
            name: item.name,
            rarity: item.rarity,
            renderMode: item.renderMode,
            priceCoin: item.priceCoin,
            imageUrl: item.imageUrl,
            templateKey: item.templateKey || "",
            templateConfigText: stringifyTemplateConfig(item.templateConfig),
            badgeText: item.badgeText || "",
            isFeatured: item.isFeatured,
            isActive: item.isActive,
            sortOrder: item.sortOrder,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                code: form.code.trim(),
                type: form.type,
                name: form.name.trim(),
                rarity: form.rarity,
                renderMode: form.renderMode,
                priceCoin: form.priceCoin,
                imageUrl: form.imageUrl.trim(),
                templateKey: form.templateKey.trim() || null,
                templateConfig: parseTemplateConfig(form.templateConfigText),
                badgeText: form.badgeText.trim() || null,
                isFeatured: form.isFeatured,
                isActive: form.isActive,
                sortOrder: form.sortOrder,
            };

            const url = editingItem ? `/api/admin/shop-items/${editingItem.id}` : "/api/admin/shop-items";
            const method = editingItem ? "PUT" : "POST";
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Kozmetik kaydedilemedi." }))) as { error?: string };
                window.alert(errorPayload.error || "Kozmetik kaydedilemedi.");
                return;
            }

            setShowModal(false);
            await loadItems();
        } catch (error) {
            window.alert(error instanceof Error ? error.message : "Template config gecersiz.");
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (item: ShopItem) => {
        try {
            await fetch(`/api/admin/shop-items/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !item.isActive }),
            });
            await loadItems();
        } catch {
            // Ignore toggle failures for now.
        }
    };

    const handleDelete = async (item: ShopItem) => {
        if (!window.confirm(`\"${item.name}\" kozmetigini pasife almak istediginize emin misiniz?`)) {
            return;
        }

        try {
            await fetch(`/api/admin/shop-items/${item.id}`, { method: "DELETE" });
            await loadItems();
        } catch {
            // Ignore delete failures for now.
        }
    };

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("category", mapUploadCategory(form.type));
            const response = await fetch("/api/admin/shop-items/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                return;
            }

            const payload = (await response.json()) as { url: string };
            setForm((current) => ({ ...current, imageUrl: payload.url }));
        } catch {
            // Ignore upload failures for now.
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    const imageUploadDisabled = form.renderMode !== "image";
    const templateExample = useMemo(() => getTemplateExample(form.type), [form.type]);
    const previewTemplateResult = useMemo(() => {
        if (form.renderMode !== "template") {
            return { config: null, error: null as string | null };
        }

        try {
            return {
                config: parseTemplateConfig(form.templateConfigText),
                error: null as string | null,
            };
        } catch (error) {
            return {
                config: null,
                error: error instanceof Error ? error.message : "Template config gecersiz.",
            };
        }
    }, [form.renderMode, form.templateConfigText]);
    const previewDraft = useMemo(() => ({
        type: form.type,
        name: form.name,
        rarity: form.rarity,
        renderMode: form.renderMode,
        imageUrl: form.imageUrl.trim(),
        templateKey: form.templateKey.trim() || null,
        templateConfig: previewTemplateResult.config,
        badgeText: form.badgeText.trim() || null,
        isFeatured: form.isFeatured,
        priceCoin: form.priceCoin,
    }), [form.badgeText, form.imageUrl, form.isFeatured, form.name, form.priceCoin, form.rarity, form.renderMode, form.templateKey, form.type, previewTemplateResult.config]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Kozmetikler</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Magaza urunlerini yonetin - {items.length} urun
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus size={16} />
                    Yeni Ekle
                </Button>
            </div>

            <ShopOrderBoard items={items} saving={reorderSaving} onReorder={(updates) => void handleReorder(updates)} />

            <Card className="border-border/50">
                <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Isim veya kod ara..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(event) => setFilterType(event.target.value as ItemType | "")}
                        className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none"
                    >
                        <option value="">Tum Turler</option>
                        <option value="avatar">Avatar</option>
                        <option value="frame">Cerceve</option>
                        <option value="card_back">Kart Arkasi</option>
                        <option value="card_face">Kart Onu</option>
                    </select>
                    <select
                        value={filterRarity}
                        onChange={(event) => setFilterRarity(event.target.value as Rarity | "")}
                        className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none"
                    >
                        <option value="">Tum Nadirlikler</option>
                        <option value="common">Common</option>
                        <option value="rare">Rare</option>
                        <option value="epic">Epic</option>
                        <option value="legendary">Legendary</option>
                    </select>
                </CardContent>
            </Card>

            <Card className="border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left p-3 font-medium text-muted-foreground">Gorsel</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Isim / Kod</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Tur</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Render</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Nadirlik</th>
                                <th className="text-center p-3 font-medium text-muted-foreground">Spotlight</th>
                                <th className="text-center p-3 font-medium text-muted-foreground">Sira</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Fiyat</th>
                                <th className="text-center p-3 font-medium text-muted-foreground">Satis</th>
                                <th className="text-center p-3 font-medium text-muted-foreground">Durum</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Islemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-muted-foreground">Yukleniyor...</td>
                                </tr>
                            )}
                            {!loading && filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-muted-foreground">Kozmetik bulunamadi.</td>
                                </tr>
                            )}
                            {filteredItems.map((item) => (
                                <tr key={item.id} className={`border-b border-border/50 transition-colors hover:bg-muted/20 ${!item.isActive ? "opacity-50" : ""}`}>
                                    <td className="p-3">
                                        {item.imageUrl ? (
                                            <Image loader={passthroughImageLoader} unoptimized src={item.imageUrl} alt={item.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover border border-border" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                <ImageIcon size={16} className="text-muted-foreground" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <div className="font-medium text-foreground">{item.name}</div>
                                            {item.badgeText ? (
                                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                    {item.badgeText}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono">{item.code}</div>
                                    </td>
                                    <td className="p-3 text-muted-foreground">{typeLabels[item.type]}</td>
                                    <td className="p-3 text-muted-foreground font-medium uppercase text-xs">{item.renderMode}</td>
                                    <td className="p-3">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${ADMIN_RARITY_BADGE_CLASS[item.rarity]}`}>{item.rarity}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${item.isFeatured ? "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300" : "bg-muted text-muted-foreground"}`}>
                                            {item.isFeatured ? "Spotlight" : "Standart"}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center font-mono text-xs text-muted-foreground">{item.sortOrder}</td>
                                    <td className="p-3 text-right font-bold text-foreground">{item.priceCoin.toLocaleString()}</td>
                                    <td className="p-3 text-center text-muted-foreground">{item._count?.purchases ?? 0}</td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => void toggleActive(item)} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${item.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`} type="button">
                                            {item.isActive ? (<><Eye size={12} /> Aktif</>) : (<><EyeOff size={12} /> Pasif</>)}
                                        </button>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex gap-1 justify-end">
                                            <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" type="button">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => void handleDelete(item)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors" type="button">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h2 className="text-lg font-bold text-foreground">{editingItem ? "Kozmetik Duzenle" : "Yeni Kozmetik"}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors" type="button">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Kod (benzersiz)</label>
                                    <input type="text" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="signal_grid_face" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Isim</label>
                                    <input type="text" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Signal Grid" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Tur</label>
                                        <select
                                            value={form.type}
                                            onChange={(event) => {
                                                const nextType = event.target.value as ItemType;
                                                setForm((current) => ({
                                                    ...current,
                                                    type: nextType,
                                                    renderMode: nextType === "avatar" ? "image" : current.renderMode,
                                                }));
                                            }}
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none"
                                        >
                                            <option value="avatar">Avatar</option>
                                            <option value="frame">Cerceve</option>
                                            <option value="card_back">Kart Arkasi</option>
                                            <option value="card_face">Kart Onu</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Nadirlik</label>
                                        <select value={form.rarity} onChange={(event) => setForm((current) => ({ ...current, rarity: event.target.value as Rarity }))} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none">
                                            <option value="common">Common</option>
                                            <option value="rare">Rare</option>
                                            <option value="epic">Epic</option>
                                            <option value="legendary">Legendary</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Render</label>
                                        <select value={form.renderMode} onChange={(event) => setForm((current) => ({ ...current, renderMode: event.target.value as RenderMode }))} disabled={form.type === "avatar"} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none disabled:opacity-60">
                                            <option value="image">Image</option>
                                            <option value="template">Template</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Fiyat (Coin)</label>
                                        <input type="number" min={0} value={form.priceCoin} onChange={(event) => setForm((current) => ({ ...current, priceCoin: Number.parseInt(event.target.value, 10) || 0 }))} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Siralama</label>
                                        <input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number.parseInt(event.target.value, 10) || 0 }))} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Etiket</label>
                                        <input type="text" value={form.badgeText} onChange={(event) => setForm((current) => ({ ...current, badgeText: event.target.value.toUpperCase() }))} placeholder="YENI / LIMITLI" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border/60 p-4 space-y-3 bg-muted/20">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">Render Kaynagi</h3>
                                            <p className="text-xs text-muted-foreground">Image urunler URL kullanir, template urunler key + config ile render edilir.</p>
                                        </div>
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{form.renderMode}</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Gorsel URL</label>
                                        <div className="flex gap-3 items-end">
                                            <div className="flex-1">
                                                <input type="text" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="/cosmetics/card-faces/signal-grid.png" disabled={imageUploadDisabled} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60" />
                                            </div>
                                            <label className={`px-3 py-2 text-sm bg-muted rounded-lg transition-colors flex items-center gap-1 font-medium text-foreground shrink-0 ${imageUploadDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/80"}`}>
                                                <Upload size={14} />
                                                {uploading ? "..." : "Yukle"}
                                                <input type="file" accept="image/*" onChange={handleUpload} disabled={imageUploadDisabled} className="hidden" />
                                            </label>
                                        </div>
                                        {form.imageUrl && (
                                            <div className="mt-2">
                                                <Image loader={passthroughImageLoader} unoptimized src={form.imageUrl} alt="Preview" width={64} height={64} className="w-16 h-16 rounded-lg object-cover border border-border" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Template Key</label>
                                            <input type="text" value={form.templateKey} onChange={(event) => setForm((current) => ({ ...current, templateKey: event.target.value }))} placeholder="signal_grid" disabled={form.renderMode !== "template"} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60" />
                                        </div>
                                        <div className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3 bg-background/60">
                                            Ornek alanlar: <code>palette</code>, <code>pattern</code>, <code>glow</code>, <code>motion</code>, <code>frame</code>.
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-1 flex items-center justify-between gap-3">
                                            <label className="block text-xs font-bold text-muted-foreground uppercase">Template Config (JSON)</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-muted-foreground">
                                                    Rehber: <code>docs/dashboard-ui/cosmetic-authoring-spec.md</code>
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={form.renderMode !== "template"}
                                                    onClick={() => setForm((current) => ({ ...current, templateConfigText: templateExample }))}
                                                    className="h-7 gap-1 px-2 text-[11px]"
                                                >
                                                    <FileJson2 size={12} />
                                                    Ornek Doldur
                                                </Button>
                                            </div>
                                        </div>
                                        <textarea value={form.templateConfigText} onChange={(event) => setForm((current) => ({ ...current, templateConfigText: event.target.value }))} placeholder={templateExample} disabled={form.renderMode !== "template"} rows={14} className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 resize-y" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                                        <input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50" />
                                        <span className="text-sm font-medium text-foreground">Sag panelde one cikar</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                                        <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50" />
                                        <span className="text-sm font-medium text-foreground">Magazada aktif</span>
                                    </label>
                                </div>
                            </div>

                            <div className="xl:sticky xl:top-0 xl:self-start">
                                <CosmeticLivePreview
                                    draft={previewDraft}
                                    templateConfigError={previewTemplateResult.error}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-border">
                            <Button variant="outline" onClick={() => setShowModal(false)}>Iptal</Button>
                            <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
                                <Save size={14} />
                                {saving ? "Kaydediliyor..." : "Kaydet"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
