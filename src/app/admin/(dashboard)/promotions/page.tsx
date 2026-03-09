"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
    CouponCodeView,
    DiscountCampaignView,
    PromotionDiscountType,
    PromotionTargetType,
    ShopBundleView,
    StoreItemView,
} from "@/types/economy";

type ItemOption = Pick<StoreItemView, "id" | "code" | "name" | "type">;

interface BundleItemFormRow {
    shopItemId: string;
    sortOrder: string;
}

interface BundleFormState {
    code: string;
    name: string;
    description: string;
    priceCoin: string;
    isActive: boolean;
    sortOrder: string;
    items: BundleItemFormRow[];
}

interface DiscountFormState {
    code: string;
    name: string;
    description: string;
    targetType: PromotionTargetType;
    discountType: PromotionDiscountType;
    percentageOff: string;
    fixedCoinOff: string;
    shopItemId: string;
    bundleId: string;
    usageLimit: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    stackableWithCoupon: boolean;
}

interface CouponFormState {
    code: string;
    name: string;
    description: string;
    targetType: PromotionTargetType;
    discountType: PromotionDiscountType;
    percentageOff: string;
    fixedCoinOff: string;
    shopItemId: string;
    bundleId: string;
    usageLimit: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
}

const emptyBundleForm: BundleFormState = {
    code: "",
    name: "",
    description: "",
    priceCoin: "0",
    isActive: true,
    sortOrder: "0",
    items: [{ shopItemId: "", sortOrder: "0" }],
};

const emptyDiscountForm: DiscountFormState = {
    code: "",
    name: "",
    description: "",
    targetType: "global",
    discountType: "percentage",
    percentageOff: "10",
    fixedCoinOff: "",
    shopItemId: "",
    bundleId: "",
    usageLimit: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
    stackableWithCoupon: false,
};

const emptyCouponForm: CouponFormState = {
    code: "",
    name: "",
    description: "",
    targetType: "global",
    discountType: "percentage",
    percentageOff: "10",
    fixedCoinOff: "",
    shopItemId: "",
    bundleId: "",
    usageLimit: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
};

function toDateTimeLocal(iso: string | null): string {
    if (!iso) {
        return "";
    }

    const date = new Date(iso);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoDateTime(value: string): string | null {
    return value ? new Date(value).toISOString() : null;
}

function toNullableInt(value: string): number | null {
    return value ? Number.parseInt(value, 10) : null;
}

function PromotionTypeBadge({ label }: { label: string }) {
    return (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {label}
        </span>
    );
}

interface PromotionFormProps {
    title: string;
    code: string;
    name: string;
    description: string;
    targetType: PromotionTargetType;
    discountType: PromotionDiscountType;
    percentageOff: string;
    fixedCoinOff: string;
    shopItemId: string;
    bundleId: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    itemOptions: ItemOption[];
    bundleOptions: Array<{ id: number; name: string; code: string }>;
    extraContent?: ReactNode;
    onChange: (patch: Record<string, string | boolean>) => void;
    onSubmit: () => void;
    onCancel?: () => void;
    saving: boolean;
}

function PromotionForm({
    title,
    code,
    name,
    description,
    targetType,
    discountType,
    percentageOff,
    fixedCoinOff,
    shopItemId,
    bundleId,
    startsAt,
    endsAt,
    isActive,
    itemOptions,
    bundleOptions,
    extraContent,
    onChange,
    onSubmit,
    onCancel,
    saving,
}: PromotionFormProps) {
    return (
        <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Kod" value={code} onChange={(event) => onChange({ code: event.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Isim" value={name} onChange={(event) => onChange({ name: event.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Aciklama" value={description} onChange={(event) => onChange({ description: event.target.value })} />
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={targetType} onChange={(event) => onChange({ targetType: event.target.value, shopItemId: "", bundleId: "" })}>
                    <option value="global">Global</option>
                    <option value="shop_item">Shop Item</option>
                    <option value="bundle">Bundle</option>
                </select>
                <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={discountType} onChange={(event) => onChange({ discountType: event.target.value, percentageOff: "", fixedCoinOff: "" })}>
                    <option value="percentage">Yuzde</option>
                    <option value="fixed_coin">Sabit Coin</option>
                </select>
                {discountType === "percentage" ? (
                    <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" type="number" placeholder="Yuzde" value={percentageOff} onChange={(event) => onChange({ percentageOff: event.target.value })} />
                ) : (
                    <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" type="number" placeholder="Coin Indirimi" value={fixedCoinOff} onChange={(event) => onChange({ fixedCoinOff: event.target.value })} />
                )}
                {targetType === "shop_item" && (
                    <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={shopItemId} onChange={(event) => onChange({ shopItemId: event.target.value })}>
                        <option value="">Urun sec</option>
                        {itemOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.name} ({option.type})</option>
                        ))}
                    </select>
                )}
                {targetType === "bundle" && (
                    <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={bundleId} onChange={(event) => onChange({ bundleId: event.target.value })}>
                        <option value="">Bundle sec</option>
                        {bundleOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.name} ({option.code})</option>
                        ))}
                    </select>
                )}
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" type="datetime-local" value={startsAt} onChange={(event) => onChange({ startsAt: event.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" type="datetime-local" value={endsAt} onChange={(event) => onChange({ endsAt: event.target.value })} />
                {extraContent}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={isActive} onChange={(event) => onChange({ isActive: event.target.checked })} />Aktif</label>
            <div className="flex gap-2">
                <Button onClick={onSubmit} disabled={saving}>Kaydet</Button>
                {onCancel && <Button variant="outline" onClick={onCancel}>Iptal</Button>}
            </div>
        </div>
    );
}

export default function PromotionsPage() {
    const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
    const [bundles, setBundles] = useState<ShopBundleView[]>([]);
    const [discounts, setDiscounts] = useState<DiscountCampaignView[]>([]);
    const [coupons, setCoupons] = useState<CouponCodeView[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingBundleId, setEditingBundleId] = useState<number | null>(null);
    const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);
    const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
    const [bundleForm, setBundleForm] = useState<BundleFormState>(emptyBundleForm);
    const [discountForm, setDiscountForm] = useState<DiscountFormState>(emptyDiscountForm);
    const [couponForm, setCouponForm] = useState<CouponFormState>(emptyCouponForm);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [itemsResponse, bundlesResponse, discountsResponse, couponsResponse] = await Promise.all([
                fetch("/api/admin/shop-items?active=true", { cache: "no-store" }),
                fetch("/api/admin/promotions/bundles", { cache: "no-store" }),
                fetch("/api/admin/promotions/discounts", { cache: "no-store" }),
                fetch("/api/admin/promotions/coupons", { cache: "no-store" }),
            ]);
            if (!itemsResponse.ok || !bundlesResponse.ok || !discountsResponse.ok || !couponsResponse.ok) {
                return;
            }
            const [itemsPayload, bundlesPayload, discountsPayload, couponsPayload] = await Promise.all([
                itemsResponse.json() as Promise<StoreItemView[]>,
                bundlesResponse.json() as Promise<ShopBundleView[]>,
                discountsResponse.json() as Promise<DiscountCampaignView[]>,
                couponsResponse.json() as Promise<CouponCodeView[]>,
            ]);
            setItemOptions(itemsPayload.map((item) => ({ id: item.id, code: item.code, name: item.name, type: item.type })));
            setBundles(bundlesPayload);
            setDiscounts(discountsPayload);
            setCoupons(couponsPayload);
        } catch {
            // Keep current state on failure.
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const bundleOptions = useMemo(() => bundles.map((bundle) => ({ id: bundle.id, name: bundle.name, code: bundle.code })), [bundles]);

    const saveBundle = async () => {
        setSaving(true);
        try {
            const payload = {
                code: bundleForm.code.trim(),
                name: bundleForm.name.trim(),
                description: bundleForm.description.trim() || null,
                priceCoin: Number.parseInt(bundleForm.priceCoin, 10),
                isActive: bundleForm.isActive,
                sortOrder: Number.parseInt(bundleForm.sortOrder, 10),
                items: bundleForm.items.filter((item) => item.shopItemId).map((item) => ({ shopItemId: Number.parseInt(item.shopItemId, 10), sortOrder: Number.parseInt(item.sortOrder, 10) })),
            };
            const response = await fetch(editingBundleId ? `/api/admin/promotions/bundles/${editingBundleId}` : "/api/admin/promotions/bundles", {
                method: editingBundleId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Bundle kaydedilemedi." }))) as { error?: string };
                window.alert(errorPayload.error || "Bundle kaydedilemedi.");
                return;
            }
            setEditingBundleId(null);
            setBundleForm(emptyBundleForm);
            await loadAll();
        } finally {
            setSaving(false);
        }
    };

    const saveDiscount = async () => {
        setSaving(true);
        try {
            const payload = {
                code: discountForm.code.trim(),
                name: discountForm.name.trim(),
                description: discountForm.description.trim() || null,
                targetType: discountForm.targetType,
                discountType: discountForm.discountType,
                percentageOff: discountForm.discountType === "percentage" ? toNullableInt(discountForm.percentageOff) : null,
                fixedCoinOff: discountForm.discountType === "fixed_coin" ? toNullableInt(discountForm.fixedCoinOff) : null,
                shopItemId: discountForm.targetType === "shop_item" ? toNullableInt(discountForm.shopItemId) : null,
                bundleId: discountForm.targetType === "bundle" ? toNullableInt(discountForm.bundleId) : null,
                usageLimit: toNullableInt(discountForm.usageLimit),
                startsAt: toIsoDateTime(discountForm.startsAt),
                endsAt: toIsoDateTime(discountForm.endsAt),
                isActive: discountForm.isActive,
                stackableWithCoupon: discountForm.stackableWithCoupon,
            };
            const response = await fetch(editingDiscountId ? `/api/admin/promotions/discounts/${editingDiscountId}` : "/api/admin/promotions/discounts", {
                method: editingDiscountId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Indirim kaydedilemedi." }))) as { error?: string };
                window.alert(errorPayload.error || "Indirim kaydedilemedi.");
                return;
            }
            setEditingDiscountId(null);
            setDiscountForm(emptyDiscountForm);
            await loadAll();
        } finally {
            setSaving(false);
        }
    };

    const saveCoupon = async () => {
        setSaving(true);
        try {
            const payload = {
                code: couponForm.code.trim(),
                name: couponForm.name.trim(),
                description: couponForm.description.trim() || null,
                targetType: couponForm.targetType,
                discountType: couponForm.discountType,
                percentageOff: couponForm.discountType === "percentage" ? toNullableInt(couponForm.percentageOff) : null,
                fixedCoinOff: couponForm.discountType === "fixed_coin" ? toNullableInt(couponForm.fixedCoinOff) : null,
                shopItemId: couponForm.targetType === "shop_item" ? toNullableInt(couponForm.shopItemId) : null,
                bundleId: couponForm.targetType === "bundle" ? toNullableInt(couponForm.bundleId) : null,
                usageLimit: toNullableInt(couponForm.usageLimit),
                startsAt: toIsoDateTime(couponForm.startsAt),
                endsAt: toIsoDateTime(couponForm.endsAt),
                isActive: couponForm.isActive,
            };
            const response = await fetch(editingCouponId ? `/api/admin/promotions/coupons/${editingCouponId}` : "/api/admin/promotions/coupons", {
                method: editingCouponId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => ({ error: "Kupon kaydedilemedi." }))) as { error?: string };
                window.alert(errorPayload.error || "Kupon kaydedilemedi.");
                return;
            }
            setEditingCouponId(null);
            setCouponForm(emptyCouponForm);
            await loadAll();
        } finally {
            setSaving(false);
        }
    };

    const deactivateEntry = async (kind: "bundles" | "discounts" | "coupons", id: number) => {
        const response = await fetch(`/api/admin/promotions/${kind}/${id}`, { method: "DELETE" });
        if (response.ok) {
            await loadAll();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Promosyonlar</h1>
                <p className="mt-1 text-sm text-muted-foreground">Bundle, indirim kampanyasi ve kupon kodlarini tek yerden yonetin.</p>
            </div>
            {loading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Yukleniyor...</CardContent></Card>}
            <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Bundle Tanimlari</CardTitle>
                        <Button size="sm" onClick={() => { setEditingBundleId(null); setBundleForm(emptyBundleForm); }} className="gap-2"><Plus size={14} />Yeni</Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {bundles.map((bundle) => (
                            <div key={bundle.id} className="rounded-2xl border border-border p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{bundle.name}</h3><PromotionTypeBadge label={bundle.isActive ? "Aktif" : "Pasif"} /></div>
                                        <p className="font-mono text-xs text-muted-foreground">{bundle.code}</p>
                                        <p className="mt-2 text-sm text-muted-foreground">{bundle.description || "Aciklama yok."}</p>
                                        <p className="mt-2 text-sm font-medium text-foreground">{bundle.priceCoin.toLocaleString()} coin</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingBundleId(bundle.id); setBundleForm({ code: bundle.code, name: bundle.name, description: bundle.description ?? "", priceCoin: String(bundle.priceCoin), isActive: bundle.isActive, sortOrder: String(bundle.sortOrder), items: bundle.items.map((item) => ({ shopItemId: String(item.shopItemId), sortOrder: String(item.sortOrder) })) }); }}><Edit2 size={14} /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => void deactivateEntry("bundles", bundle.id)}><Trash2 size={14} /></Button>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">{bundle.items.map((item) => <span key={item.id} className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">{item.itemName} ({item.itemType})</span>)}</div>
                            </div>
                        ))}
                        <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                            <h3 className="font-semibold text-foreground">{editingBundleId ? "Bundle Duzenle" : "Yeni Bundle"}</h3>
                            <div className="grid gap-3 md:grid-cols-2">
                                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Kod" value={bundleForm.code} onChange={(event) => setBundleForm((current) => ({ ...current, code: event.target.value }))} />
                                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Isim" value={bundleForm.name} onChange={(event) => setBundleForm((current) => ({ ...current, name: event.target.value }))} />
                                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Aciklama" value={bundleForm.description} onChange={(event) => setBundleForm((current) => ({ ...current, description: event.target.value }))} />
                                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" type="number" placeholder="Fiyat" value={bundleForm.priceCoin} onChange={(event) => setBundleForm((current) => ({ ...current, priceCoin: event.target.value }))} />
                                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" type="number" placeholder="Sira" value={bundleForm.sortOrder} onChange={(event) => setBundleForm((current) => ({ ...current, sortOrder: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between"><p className="text-sm font-medium text-foreground">Bundle Icerigi</p><Button type="button" variant="outline" size="sm" onClick={() => setBundleForm((current) => ({ ...current, items: [...current.items, { shopItemId: "", sortOrder: String(current.items.length) }] }))}>Satir Ekle</Button></div>
                                {bundleForm.items.map((item, index) => (
                                    <div key={`${index}-${item.shopItemId}`} className="grid gap-2 md:grid-cols-[1fr_110px_44px]">
                                        <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={item.shopItemId} onChange={(event) => setBundleForm((current) => ({ ...current, items: current.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, shopItemId: event.target.value } : entry) }))}><option value="">Urun sec</option>{itemOptions.map((option) => <option key={option.id} value={option.id}>{option.name} ({option.type})</option>)}</select>
                                        <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" type="number" placeholder="Sira" value={item.sortOrder} onChange={(event) => setBundleForm((current) => ({ ...current, items: current.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, sortOrder: event.target.value } : entry) }))} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setBundleForm((current) => ({ ...current, items: current.items.filter((_, entryIndex) => entryIndex !== index) }))} disabled={bundleForm.items.length === 1}><Trash2 size={14} /></Button>
                                    </div>
                                ))}
                            </div>
                            <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={bundleForm.isActive} onChange={(event) => setBundleForm((current) => ({ ...current, isActive: event.target.checked }))} />Aktif</label>
                            <div className="flex gap-2"><Button onClick={() => void saveBundle()} disabled={saving}>{editingBundleId ? "Guncelle" : "Olustur"}</Button>{editingBundleId && <Button variant="outline" onClick={() => { setEditingBundleId(null); setBundleForm(emptyBundleForm); }}>Iptal</Button>}</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Indirim Kampanyalari</CardTitle><Button size="sm" onClick={() => { setEditingDiscountId(null); setDiscountForm(emptyDiscountForm); }} className="gap-2"><Plus size={14} />Yeni</Button></CardHeader>
                    <CardContent className="space-y-4">
                        {discounts.map((discount) => (
                            <div key={discount.id} className="rounded-2xl border border-border p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{discount.name}</h3><PromotionTypeBadge label={discount.targetType} /></div>
                                        <p className="font-mono text-xs text-muted-foreground">{discount.code}</p>
                                        <p className="mt-2 text-sm text-muted-foreground">{discount.discountType === "percentage" ? `%${discount.percentageOff} indirim` : `${discount.fixedCoinOff} coin indirim`}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Kullanim: {discount.usedCount}{discount.usageLimit ? ` / ${discount.usageLimit}` : ""}</p>
                                    </div>
                                    <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingDiscountId(discount.id); setDiscountForm({ code: discount.code, name: discount.name, description: discount.description ?? "", targetType: discount.targetType, discountType: discount.discountType, percentageOff: discount.percentageOff ? String(discount.percentageOff) : "", fixedCoinOff: discount.fixedCoinOff ? String(discount.fixedCoinOff) : "", shopItemId: discount.shopItemId ? String(discount.shopItemId) : "", bundleId: discount.bundleId ? String(discount.bundleId) : "", usageLimit: discount.usageLimit ? String(discount.usageLimit) : "", startsAt: toDateTimeLocal(discount.startsAt), endsAt: toDateTimeLocal(discount.endsAt), isActive: discount.isActive, stackableWithCoupon: discount.stackableWithCoupon }); }}><Edit2 size={14} /></Button><Button variant="ghost" size="icon" onClick={() => void deactivateEntry("discounts", discount.id)}><Trash2 size={14} /></Button></div>
                                </div>
                            </div>
                        ))}
                        <PromotionForm title={editingDiscountId ? "Indirim Duzenle" : "Yeni Indirim"} code={discountForm.code} name={discountForm.name} description={discountForm.description} targetType={discountForm.targetType} discountType={discountForm.discountType} percentageOff={discountForm.percentageOff} fixedCoinOff={discountForm.fixedCoinOff} shopItemId={discountForm.shopItemId} bundleId={discountForm.bundleId} startsAt={discountForm.startsAt} endsAt={discountForm.endsAt} isActive={discountForm.isActive} itemOptions={itemOptions} bundleOptions={bundleOptions} extraContent={<><input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Kullanim Limiti" type="number" value={discountForm.usageLimit} onChange={(event) => setDiscountForm((current) => ({ ...current, usageLimit: event.target.value }))} /><label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={discountForm.stackableWithCoupon} onChange={(event) => setDiscountForm((current) => ({ ...current, stackableWithCoupon: event.target.checked }))} />Kupon ile birikebilir</label></>} onChange={(patch) => setDiscountForm((current) => ({ ...current, ...patch } as DiscountFormState))} onSubmit={() => void saveDiscount()} onCancel={editingDiscountId ? () => { setEditingDiscountId(null); setDiscountForm(emptyDiscountForm); } : undefined} saving={saving} />
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Kupon Kodlari</CardTitle><Button size="sm" onClick={() => { setEditingCouponId(null); setCouponForm(emptyCouponForm); }} className="gap-2"><Plus size={14} />Yeni</Button></CardHeader>
                <CardContent className="space-y-4">
                    {coupons.map((coupon) => (
                        <div key={coupon.id} className="rounded-2xl border border-border p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{coupon.name}</h3><PromotionTypeBadge label={coupon.targetType} /></div>
                                    <p className="font-mono text-xs text-muted-foreground">{coupon.code}</p>
                                    <p className="mt-2 text-sm text-muted-foreground">{coupon.discountType === "percentage" ? `%${coupon.percentageOff} indirim` : `${coupon.fixedCoinOff} coin indirim`}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Kullanim: {coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</p>
                                </div>
                                <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingCouponId(coupon.id); setCouponForm({ code: coupon.code, name: coupon.name, description: coupon.description ?? "", targetType: coupon.targetType, discountType: coupon.discountType, percentageOff: coupon.percentageOff ? String(coupon.percentageOff) : "", fixedCoinOff: coupon.fixedCoinOff ? String(coupon.fixedCoinOff) : "", shopItemId: coupon.shopItemId ? String(coupon.shopItemId) : "", bundleId: coupon.bundleId ? String(coupon.bundleId) : "", usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "", startsAt: toDateTimeLocal(coupon.startsAt), endsAt: toDateTimeLocal(coupon.endsAt), isActive: coupon.isActive }); }}><Edit2 size={14} /></Button><Button variant="ghost" size="icon" onClick={() => void deactivateEntry("coupons", coupon.id)}><Trash2 size={14} /></Button></div>
                            </div>
                        </div>
                    ))}
                    <PromotionForm title={editingCouponId ? "Kupon Duzenle" : "Yeni Kupon"} code={couponForm.code} name={couponForm.name} description={couponForm.description} targetType={couponForm.targetType} discountType={couponForm.discountType} percentageOff={couponForm.percentageOff} fixedCoinOff={couponForm.fixedCoinOff} shopItemId={couponForm.shopItemId} bundleId={couponForm.bundleId} startsAt={couponForm.startsAt} endsAt={couponForm.endsAt} isActive={couponForm.isActive} itemOptions={itemOptions} bundleOptions={bundleOptions} extraContent={<input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Kullanim Limiti" type="number" value={couponForm.usageLimit} onChange={(event) => setCouponForm((current) => ({ ...current, usageLimit: event.target.value }))} />} onChange={(patch) => setCouponForm((current) => ({ ...current, ...patch } as CouponFormState))} onSubmit={() => void saveCoupon()} onCancel={editingCouponId ? () => { setEditingCouponId(null); setCouponForm(emptyCouponForm); } : undefined} saving={saving} />
                </CardContent>
            </Card>
        </div>
    );
}
