"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Upload,
    Eye,
    EyeOff,
    X,
    Save,
    Image as ImageIcon,
} from "lucide-react";

type ItemType = "avatar" | "frame" | "card_back";
type Rarity = "common" | "rare" | "epic" | "legendary";

interface ShopItem {
    id: number;
    code: string;
    type: ItemType;
    name: string;
    rarity: Rarity;
    priceCoin: number;
    imageUrl: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    _count?: { inventoryItems: number; purchases: number };
}

const rarityColors: Record<Rarity, string> = {
    common: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    rare: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    epic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    legendary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const typeLabels: Record<ItemType, string> = {
    avatar: "Avatar",
    frame: "Çerçeve",
    card_back: "Kart Arkası",
};

const emptyItem: Omit<ShopItem, "id" | "createdAt" | "_count"> = {
    code: "",
    type: "avatar",
    name: "",
    rarity: "common",
    priceCoin: 100,
    imageUrl: "",
    isActive: true,
    sortOrder: 0,
};

export default function ShopItemsPage() {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<ItemType | "">("");
    const [filterRarity, setFilterRarity] = useState<Rarity | "">("");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [form, setForm] = useState(emptyItem);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/shop-items", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadItems();
    }, [loadItems]);

    const filtered = useMemo(() => {
        return items.filter((item) => {
            if (filterType && item.type !== filterType) return false;
            if (filterRarity && item.rarity !== filterRarity) return false;
            if (
                search &&
                !item.name.toLowerCase().includes(search.toLowerCase()) &&
                !item.code.toLowerCase().includes(search.toLowerCase())
            )
                return false;
            return true;
        });
    }, [items, search, filterType, filterRarity]);

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
            priceCoin: item.priceCoin,
            imageUrl: item.imageUrl,
            isActive: item.isActive,
            sortOrder: item.sortOrder,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editingItem
                ? `/api/admin/shop-items/${editingItem.id}`
                : "/api/admin/shop-items";
            const method = editingItem ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setShowModal(false);
                await loadItems();
            }
        } catch {
            // silently fail
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
            // silently fail
        }
    };

    const handleDelete = async (item: ShopItem) => {
        if (!confirm(`"${item.name}" kozmetiğini pasife almak istediğinize emin misiniz?`)) return;
        try {
            await fetch(`/api/admin/shop-items/${item.id}`, { method: "DELETE" });
            await loadItems();
        } catch {
            // silently fail
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("category", form.type === "card_back" ? "card-backs" : `${form.type}s`);
            const res = await fetch("/api/admin/shop-items/upload", {
                method: "POST",
                body: fd,
            });
            if (res.ok) {
                const data = await res.json();
                setForm((prev) => ({ ...prev, imageUrl: data.url }));
            }
        } catch {
            // silently fail
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Kozmetikler</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Mağaza ürünlerini yönetin — {items.length} ürün
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus size={16} />
                    Yeni Ekle
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-border/50">
                <CardContent className="p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="İsim veya kod ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as ItemType | "")}
                        className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none"
                    >
                        <option value="">Tüm Türler</option>
                        <option value="avatar">Avatar</option>
                        <option value="frame">Çerçeve</option>
                        <option value="card_back">Kart Arkası</option>
                    </select>
                    <select
                        value={filterRarity}
                        onChange={(e) => setFilterRarity(e.target.value as Rarity | "")}
                        className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none"
                    >
                        <option value="">Tüm Nadirlikler</option>
                        <option value="common">Common</option>
                        <option value="rare">Rare</option>
                        <option value="epic">Epic</option>
                        <option value="legendary">Legendary</option>
                    </select>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left p-3 font-medium text-muted-foreground">
                                    Görsel
                                </th>
                                <th className="text-left p-3 font-medium text-muted-foreground">
                                    İsim / Kod
                                </th>
                                <th className="text-left p-3 font-medium text-muted-foreground">
                                    Tür
                                </th>
                                <th className="text-left p-3 font-medium text-muted-foreground">
                                    Nadirlik
                                </th>
                                <th className="text-right p-3 font-medium text-muted-foreground">
                                    Fiyat
                                </th>
                                <th className="text-center p-3 font-medium text-muted-foreground">
                                    Satış
                                </th>
                                <th className="text-center p-3 font-medium text-muted-foreground">
                                    Durum
                                </th>
                                <th className="text-right p-3 font-medium text-muted-foreground">
                                    İşlemler
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                        Yükleniyor...
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                        Kozmetik bulunamadı.
                                    </td>
                                </tr>
                            )}
                            {filtered.map((item) => (
                                <tr
                                    key={item.id}
                                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${!item.isActive ? "opacity-50" : ""
                                        }`}
                                >
                                    <td className="p-3">
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.name}
                                                className="w-10 h-10 rounded-lg object-cover border border-border"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                <ImageIcon size={16} className="text-muted-foreground" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <div className="font-medium text-foreground">
                                            {item.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono">
                                            {item.code}
                                        </div>
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {typeLabels[item.type]}
                                    </td>
                                    <td className="p-3">
                                        <span
                                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${rarityColors[item.rarity]}`}
                                        >
                                            {item.rarity}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-bold text-foreground">
                                        {item.priceCoin.toLocaleString()} 🪙
                                    </td>
                                    <td className="p-3 text-center text-muted-foreground">
                                        {item._count?.purchases ?? 0}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => toggleActive(item)}
                                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${item.isActive
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                }`}
                                        >
                                            {item.isActive ? (
                                                <>
                                                    <Eye size={12} /> Aktif
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff size={12} /> Pasif
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex gap-1 justify-end">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                                            >
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

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h2 className="text-lg font-bold text-foreground">
                                {editingItem ? "Kozmetik Düzenle" : "Yeni Kozmetik"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Code */}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                    Kod (benzersiz)
                                </label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, code: e.target.value }))
                                    }
                                    placeholder="dragon_fire_avatar"
                                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                    İsim
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, name: e.target.value }))
                                    }
                                    placeholder="Dragon Fire"
                                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* Type & Rarity */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                        Tür
                                    </label>
                                    <select
                                        value={form.type}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                type: e.target.value as ItemType,
                                            }))
                                        }
                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none"
                                    >
                                        <option value="avatar">Avatar</option>
                                        <option value="frame">Çerçeve</option>
                                        <option value="card_back">Kart Arkası</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                        Nadirlik
                                    </label>
                                    <select
                                        value={form.rarity}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                rarity: e.target.value as Rarity,
                                            }))
                                        }
                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none"
                                    >
                                        <option value="common">Common</option>
                                        <option value="rare">Rare</option>
                                        <option value="epic">Epic</option>
                                        <option value="legendary">Legendary</option>
                                    </select>
                                </div>
                            </div>

                            {/* Price & Sort Order */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                        Fiyat (Coin)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.priceCoin}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                priceCoin: parseInt(e.target.value) || 0,
                                            }))
                                        }
                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                        Sıralama
                                    </label>
                                    <input
                                        type="number"
                                        value={form.sortOrder}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                sortOrder: parseInt(e.target.value) || 0,
                                            }))
                                        }
                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                                    Görsel
                                </label>
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={form.imageUrl}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    imageUrl: e.target.value,
                                                }))
                                            }
                                            placeholder="/cosmetics/avatars/dragon.png"
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <label className="px-3 py-2 text-sm bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors flex items-center gap-1 font-medium text-foreground shrink-0">
                                        <Upload size={14} />
                                        {uploading ? "..." : "Yükle"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                {form.imageUrl && (
                                    <div className="mt-2">
                                        <img
                                            src={form.imageUrl}
                                            alt="Preview"
                                            className="w-16 h-16 rounded-lg object-cover border border-border"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Active toggle */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            isActive: e.target.checked,
                                        }))
                                    }
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                                />
                                <span className="text-sm font-medium text-foreground">
                                    Mağazada aktif
                                </span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-border">
                            <Button
                                variant="outline"
                                onClick={() => setShowModal(false)}
                            >
                                İptal
                            </Button>
                            <Button onClick={handleSave} disabled={saving} className="gap-2">
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
