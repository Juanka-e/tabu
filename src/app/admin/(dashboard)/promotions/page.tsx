"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminTableShell, AdminEmptyState } from "@/components/admin/admin-table-shell";
import { AdminToolbar, AdminToolbarStats } from "@/components/admin/admin-toolbar";
import { matchesAdminSearch } from "@/lib/admin/admin-table";
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

const inputClassName = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-blue-500";
const sectionClassName = "space-y-3 rounded-2xl border border-border/80 bg-background/80 p-4";
const helperClassName = "text-xs text-muted-foreground";

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
    const trimmed = value.trim();
    return trimmed ? Number.parseInt(trimmed, 10) : null;
}

function PromotionTypeBadge({ label }: { label: string }) {
    return (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {label}
        </span>
    );
}

function FieldLabel({ label, helper }: { label: string; helper?: string }) {
    return (
        <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
            {helper ? <div className={helperClassName}>{helper}</div> : null}
        </div>
    );
}

function ToggleField({
    checked,
    label,
    description,
    onChange,
}: {
    checked: boolean;
    label: string;
    description: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm text-foreground">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span className="space-y-1">
                <span className="block font-semibold">{label}</span>
                <span className={helperClassName}>{description}</span>
            </span>
        </label>
    );
}
function TargetScopeFields({
    targetType,
    shopItemId,
    bundleId,
    itemOptions,
    bundleOptions,
    onTargetTypeChange,
    onShopItemChange,
    onBundleChange,
}: {
    targetType: PromotionTargetType;
    shopItemId: string;
    bundleId: string;
    itemOptions: ItemOption[];
    bundleOptions: Array<{ id: number; name: string; code: string }>;
    onTargetTypeChange: (value: PromotionTargetType) => void;
    onShopItemChange: (value: string) => void;
    onBundleChange: (value: string) => void;
}) {
    return (
        <div className={sectionClassName}>
            <FieldLabel
                label="Hedef"
                helper="Promosyonun tum katalogda mi, tek urunde mi yoksa bir bundle uzerinde mi calisacagini sec."
            />
            <div className="grid gap-3 md:grid-cols-3">
                <button
                    type="button"
                    onClick={() => onTargetTypeChange("global")}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${targetType === "global" ? "border-blue-500 bg-blue-500/10" : "border-border bg-background hover:border-blue-300"}`}
                >
                    <div className="font-semibold text-foreground">Global</div>
                    <div className={helperClassName}>Tum urun ve bundlelara acik.</div>
                </button>
                <button
                    type="button"
                    onClick={() => onTargetTypeChange("shop_item")}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${targetType === "shop_item" ? "border-blue-500 bg-blue-500/10" : "border-border bg-background hover:border-blue-300"}`}
                >
                    <div className="font-semibold text-foreground">Tek Urun</div>
                    <div className={helperClassName}>Sadece secili shop item icin gecerli.</div>
                </button>
                <button
                    type="button"
                    onClick={() => onTargetTypeChange("bundle")}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${targetType === "bundle" ? "border-blue-500 bg-blue-500/10" : "border-border bg-background hover:border-blue-300"}`}
                >
                    <div className="font-semibold text-foreground">Bundle</div>
                    <div className={helperClassName}>Sadece secilen bundle fiyatina uygulanir.</div>
                </button>
            </div>
            {targetType === "shop_item" ? (
                <div className="space-y-2">
                    <FieldLabel label="Hedef Urun" helper="Kampanyanin baglanacagi shop item." />
                    <select className={inputClassName} value={shopItemId} onChange={(event) => onShopItemChange(event.target.value)}>
                        <option value="">Urun sec</option>
                        {itemOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.name} ({option.type})</option>
                        ))}
                    </select>
                </div>
            ) : null}
            {targetType === "bundle" ? (
                <div className="space-y-2">
                    <FieldLabel label="Hedef Bundle" helper="Kampanyanin baglanacagi bundle." />
                    <select className={inputClassName} value={bundleId} onChange={(event) => onBundleChange(event.target.value)}>
                        <option value="">Bundle sec</option>
                        {bundleOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.name} ({option.code})</option>
                        ))}
                    </select>
                </div>
            ) : null}
        </div>
    );
}

function DiscountValueFields({
    discountType,
    percentageOff,
    fixedCoinOff,
    onDiscountTypeChange,
    onPercentageChange,
    onFixedCoinChange,
}: {
    discountType: PromotionDiscountType;
    percentageOff: string;
    fixedCoinOff: string;
    onDiscountTypeChange: (value: PromotionDiscountType) => void;
    onPercentageChange: (value: string) => void;
    onFixedCoinChange: (value: string) => void;
}) {
    return (
        <div className={sectionClassName}>
            <FieldLabel label="Indirim Tipi" helper="Yuzde veya sabit coin indirimi sec. Alanlar secime gore degisir." />
            <div className="grid gap-3 md:grid-cols-2">
                <button
                    type="button"
                    onClick={() => onDiscountTypeChange("percentage")}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${discountType === "percentage" ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-background hover:border-emerald-300"}`}
                >
                    <div className="font-semibold text-foreground">Yuzde</div>
                    <div className={helperClassName}>Oransal indirim uygular.</div>
                </button>
                <button
                    type="button"
                    onClick={() => onDiscountTypeChange("fixed_coin")}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${discountType === "fixed_coin" ? "border-amber-500 bg-amber-500/10" : "border-border bg-background hover:border-amber-300"}`}
                >
                    <div className="font-semibold text-foreground">Sabit Coin</div>
                    <div className={helperClassName}>Fiyattan dogrudan coin dusurur.</div>
                </button>
            </div>
            {discountType === "percentage" ? (
                <div className="space-y-2">
                    <FieldLabel label="Yuzde Orani" helper="1 ile 100 arasinda tam sayi." />
                    <input className={inputClassName} type="number" min="1" max="100" value={percentageOff} onChange={(event) => onPercentageChange(event.target.value)} />
                </div>
            ) : (
                <div className="space-y-2">
                    <FieldLabel label="Coin Indirimi" helper="Sepetten dusulecek sabit coin miktari." />
                    <input className={inputClassName} type="number" min="1" value={fixedCoinOff} onChange={(event) => onFixedCoinChange(event.target.value)} />
                </div>
            )}
        </div>
    );
}

function ScheduleFields({
    usageLimit,
    startsAt,
    endsAt,
    isActive,
    onUsageLimitChange,
    onStartsAtChange,
    onEndsAtChange,
    onIsActiveChange,
}: {
    usageLimit: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    onUsageLimitChange: (value: string) => void;
    onStartsAtChange: (value: string) => void;
    onEndsAtChange: (value: string) => void;
    onIsActiveChange: (value: boolean) => void;
}) {
    return (
        <div className={sectionClassName}>
            <FieldLabel label="Takvim ve Limit" helper="Promosyonun ne zaman aktif olacagini ve kac kez kullanilabilecegini belirler." />
            <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                    <FieldLabel label="Kullanim Limiti" helper="Bos birakilirsa limitsiz." />
                    <input className={inputClassName} type="number" min="1" value={usageLimit} onChange={(event) => onUsageLimitChange(event.target.value)} placeholder="Orn. 500" />
                </div>
                <div className="space-y-2">
                    <FieldLabel label="Baslangic" helper="Bos ise hemen aktif olabilir." />
                    <input className={inputClassName} type="datetime-local" value={startsAt} onChange={(event) => onStartsAtChange(event.target.value)} />
                </div>
                <div className="space-y-2">
                    <FieldLabel label="Bitis" helper="Bos ise manuel kapatilana kadar acik kalir." />
                    <input className={inputClassName} type="datetime-local" value={endsAt} onChange={(event) => onEndsAtChange(event.target.value)} />
                </div>
            </div>
            <ToggleField
                checked={isActive}
                label="Aktif"
                description="Pasif promosyon liste icinde kalsa da checkout tarafinda kullanilmaz."
                onChange={onIsActiveChange}
            />
        </div>
    );
}
function BundleEditor({
    form,
    itemOptions,
    editing,
    saving,
    onChange,
    onItemChange,
    onAddItem,
    onRemoveItem,
    onSubmit,
    onCancel,
}: {
    form: BundleFormState;
    itemOptions: ItemOption[];
    editing: boolean;
    saving: boolean;
    onChange: (patch: Partial<BundleFormState>) => void;
    onItemChange: (index: number, patch: Partial<BundleItemFormRow>) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    onSubmit: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="space-y-4 rounded-3xl border border-border bg-muted/20 p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">{editing ? "Bundle duzenle" : "Yeni bundle"}</h3>
                    <p className={helperClassName}>Fiyat, sira ve bundle icerigini tek yerden tanimla.</p>
                </div>
                <PromotionTypeBadge label="bundle" />
            </div>
            <div className={sectionClassName}>
                <FieldLabel label="Kimlik" helper="Kod checkout ve seed tarafinda tekil anahtar olarak kullanilir." />
                <div className="grid gap-3 md:grid-cols-2">
                    <input className={inputClassName} placeholder="Kod" value={form.code} onChange={(event) => onChange({ code: event.target.value })} />
                    <input className={inputClassName} placeholder="Isim" value={form.name} onChange={(event) => onChange({ name: event.target.value })} />
                </div>
                <textarea className={`${inputClassName} min-h-[88px] resize-y`} placeholder="Aciklama" value={form.description} onChange={(event) => onChange({ description: event.target.value })} />
            </div>
            <div className={sectionClassName}>
                <FieldLabel label="Magaza Ayarlari" helper="Bundle fiyatini ve vitrindeki sirasini belirler." />
                <div className="grid gap-3 md:grid-cols-2">
                    <input className={inputClassName} type="number" min="0" placeholder="Fiyat" value={form.priceCoin} onChange={(event) => onChange({ priceCoin: event.target.value })} />
                    <input className={inputClassName} type="number" min="0" placeholder="Sira" value={form.sortOrder} onChange={(event) => onChange({ sortOrder: event.target.value })} />
                </div>
                <ToggleField
                    checked={form.isActive}
                    label="Aktif"
                    description="Pasif bundle store katalogunda gizli kalir ama admin listesinde gorunur."
                    onChange={(value) => onChange({ isActive: value })}
                />
            </div>
            <div className={sectionClassName}>
                <div className="flex items-start justify-between gap-4">
                    <FieldLabel label="Bundle Icerigi" helper="Urun tekrar etmemeli. Siralama bundle detayinda gorunen sira olur." />
                    <Button type="button" variant="outline" size="sm" onClick={onAddItem}>Satir ekle</Button>
                </div>
                <div className="space-y-3">
                    {form.items.map((item, index) => (
                        <div key={`bundle-item-${index}`} className="grid gap-3 md:grid-cols-[1fr_120px_44px]">
                            <select className={inputClassName} value={item.shopItemId} onChange={(event) => onItemChange(index, { shopItemId: event.target.value })}>
                                <option value="">Urun sec</option>
                                {itemOptions.map((option) => (
                                    <option key={option.id} value={option.id}>{option.name} ({option.type})</option>
                                ))}
                            </select>
                            <input className={inputClassName} type="number" min="0" value={item.sortOrder} onChange={(event) => onItemChange(index, { sortOrder: event.target.value })} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveItem(index)} disabled={form.items.length === 1}><Trash2 size={14} /></Button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex gap-2">
                <Button onClick={onSubmit} disabled={saving}>{editing ? "Guncelle" : "Olustur"}</Button>
                {editing ? <Button variant="outline" onClick={onCancel}>Iptal</Button> : null}
            </div>
        </div>
    );
}

function DiscountEditor({
    form,
    itemOptions,
    bundleOptions,
    editing,
    saving,
    onChange,
    onSubmit,
    onCancel,
}: {
    form: DiscountFormState;
    itemOptions: ItemOption[];
    bundleOptions: Array<{ id: number; name: string; code: string }>;
    editing: boolean;
    saving: boolean;
    onChange: (patch: Partial<DiscountFormState>) => void;
    onSubmit: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="space-y-4 rounded-3xl border border-border bg-muted/20 p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">{editing ? "Indirim duzenle" : "Yeni indirim kampanyasi"}</h3>
                    <p className={helperClassName}>Checkout fiyatina otomatik uygulanan kampanya. Kuponsuz da calisir.</p>
                </div>
                <PromotionTypeBadge label="campaign" />
            </div>
            <div className={sectionClassName}>
                <FieldLabel label="Kampanya Kimligi" helper="Kod tekil olmalidir. Admin listesinde ve audit logda gorunur." />
                <div className="grid gap-3 md:grid-cols-2">
                    <input className={inputClassName} placeholder="Kod" value={form.code} onChange={(event) => onChange({ code: event.target.value })} />
                    <input className={inputClassName} placeholder="Isim" value={form.name} onChange={(event) => onChange({ name: event.target.value })} />
                </div>
                <textarea className={`${inputClassName} min-h-[88px] resize-y`} placeholder="Aciklama" value={form.description} onChange={(event) => onChange({ description: event.target.value })} />
            </div>
            <TargetScopeFields
                targetType={form.targetType}
                shopItemId={form.shopItemId}
                bundleId={form.bundleId}
                itemOptions={itemOptions}
                bundleOptions={bundleOptions}
                onTargetTypeChange={(value) => onChange({ targetType: value, shopItemId: "", bundleId: "" })}
                onShopItemChange={(value) => onChange({ shopItemId: value })}
                onBundleChange={(value) => onChange({ bundleId: value })}
            />
            <DiscountValueFields
                discountType={form.discountType}
                percentageOff={form.percentageOff}
                fixedCoinOff={form.fixedCoinOff}
                onDiscountTypeChange={(value) => onChange({ discountType: value, percentageOff: value === "percentage" ? form.percentageOff || "10" : "", fixedCoinOff: value === "fixed_coin" ? form.fixedCoinOff || "25" : "" })}
                onPercentageChange={(value) => onChange({ percentageOff: value })}
                onFixedCoinChange={(value) => onChange({ fixedCoinOff: value })}
            />
            <ScheduleFields
                usageLimit={form.usageLimit}
                startsAt={form.startsAt}
                endsAt={form.endsAt}
                isActive={form.isActive}
                onUsageLimitChange={(value) => onChange({ usageLimit: value })}
                onStartsAtChange={(value) => onChange({ startsAt: value })}
                onEndsAtChange={(value) => onChange({ endsAt: value })}
                onIsActiveChange={(value) => onChange({ isActive: value })}
            />
            <ToggleField
                checked={form.stackableWithCoupon}
                label="Kupon ile birikebilir"
                description="Ayni checkout icinde bu kampanya ustune ek kupon indirimi uygulanabilsin."
                onChange={(value) => onChange({ stackableWithCoupon: value })}
            />
            <div className="flex gap-2">
                <Button onClick={onSubmit} disabled={saving}>{editing ? "Guncelle" : "Olustur"}</Button>
                {editing ? <Button variant="outline" onClick={onCancel}>Iptal</Button> : null}
            </div>
        </div>
    );
}

function CouponEditor({
    form,
    itemOptions,
    bundleOptions,
    editing,
    saving,
    onChange,
    onSubmit,
    onCancel,
}: {
    form: CouponFormState;
    itemOptions: ItemOption[];
    bundleOptions: Array<{ id: number; name: string; code: string }>;
    editing: boolean;
    saving: boolean;
    onChange: (patch: Partial<CouponFormState>) => void;
    onSubmit: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="space-y-4 rounded-3xl border border-border bg-muted/20 p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">{editing ? "Kupon duzenle" : "Yeni kupon"}</h3>
                    <p className={helperClassName}>Oyuncunun elle girdigi kod. Global veya hedefli olabilir.</p>
                </div>
                <PromotionTypeBadge label="coupon" />
            </div>
            <div className={sectionClassName}>
                <FieldLabel label="Kupon Kimligi" helper="Kod oyuncuya gorunur. Buyuk kucuk harf normalize edilir ama okunabilir format kullan." />
                <div className="grid gap-3 md:grid-cols-2">
                    <input className={`${inputClassName} font-mono uppercase`} placeholder="SPRING25" value={form.code} onChange={(event) => onChange({ code: event.target.value.toUpperCase() })} />
                    <input className={inputClassName} placeholder="Isim" value={form.name} onChange={(event) => onChange({ name: event.target.value })} />
                </div>
                <textarea className={`${inputClassName} min-h-[88px] resize-y`} placeholder="Aciklama" value={form.description} onChange={(event) => onChange({ description: event.target.value })} />
            </div>
            <TargetScopeFields
                targetType={form.targetType}
                shopItemId={form.shopItemId}
                bundleId={form.bundleId}
                itemOptions={itemOptions}
                bundleOptions={bundleOptions}
                onTargetTypeChange={(value) => onChange({ targetType: value, shopItemId: "", bundleId: "" })}
                onShopItemChange={(value) => onChange({ shopItemId: value })}
                onBundleChange={(value) => onChange({ bundleId: value })}
            />
            <DiscountValueFields
                discountType={form.discountType}
                percentageOff={form.percentageOff}
                fixedCoinOff={form.fixedCoinOff}
                onDiscountTypeChange={(value) => onChange({ discountType: value, percentageOff: value === "percentage" ? form.percentageOff || "10" : "", fixedCoinOff: value === "fixed_coin" ? form.fixedCoinOff || "25" : "" })}
                onPercentageChange={(value) => onChange({ percentageOff: value })}
                onFixedCoinChange={(value) => onChange({ fixedCoinOff: value })}
            />
            <ScheduleFields
                usageLimit={form.usageLimit}
                startsAt={form.startsAt}
                endsAt={form.endsAt}
                isActive={form.isActive}
                onUsageLimitChange={(value) => onChange({ usageLimit: value })}
                onStartsAtChange={(value) => onChange({ startsAt: value })}
                onEndsAtChange={(value) => onChange({ endsAt: value })}
                onIsActiveChange={(value) => onChange({ isActive: value })}
            />
            <div className="flex gap-2">
                <Button onClick={onSubmit} disabled={saving}>{editing ? "Guncelle" : "Olustur"}</Button>
                {editing ? <Button variant="outline" onClick={onCancel}>Iptal</Button> : null}
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
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [editingBundleId, setEditingBundleId] = useState<number | null>(null);
    const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);
    const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
    const [bundleForm, setBundleForm] = useState<BundleFormState>(emptyBundleForm);
    const [discountForm, setDiscountForm] = useState<DiscountFormState>(emptyDiscountForm);
    const [couponForm, setCouponForm] = useState<CouponFormState>(emptyCouponForm);

    const bundleOptions = useMemo(
        () => bundles.map((bundle) => ({ id: bundle.id, name: bundle.name, code: bundle.code })),
        [bundles]
    );
    const filteredBundles = useMemo(
        () =>
            bundles.filter((bundle) =>
                matchesAdminSearch(search, [
                    bundle.name,
                    bundle.code,
                    bundle.description ?? "",
                ])
            ),
        [bundles, search]
    );
    const filteredDiscounts = useMemo(
        () =>
            discounts.filter((discount) =>
                matchesAdminSearch(search, [
                    discount.name,
                    discount.code,
                    discount.description ?? "",
                    discount.targetType,
                ])
            ),
        [discounts, search]
    );
    const filteredCoupons = useMemo(
        () =>
            coupons.filter((coupon) =>
                matchesAdminSearch(search, [
                    coupon.name,
                    coupon.code,
                    coupon.description ?? "",
                    coupon.targetType,
                ])
            ),
        [coupons, search]
    );

    const loadAll = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [itemsResponse, bundlesResponse, discountsResponse, couponsResponse] = await Promise.all([
                fetch("/api/admin/shop-items?active=true", { cache: "no-store" }),
                fetch("/api/admin/promotions/bundles", { cache: "no-store" }),
                fetch("/api/admin/promotions/discounts", { cache: "no-store" }),
                fetch("/api/admin/promotions/coupons", { cache: "no-store" }),
            ]);

            if (!itemsResponse.ok || !bundlesResponse.ok || !discountsResponse.ok || !couponsResponse.ok) {
                setLoadError("Admin promosyon verileri yuklenemedi.");
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
            setLoadError("Admin promosyon verileri yuklenemedi.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

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
                items: bundleForm.items.map((item) => ({
                    shopItemId: Number.parseInt(item.shopItemId, 10),
                    sortOrder: Number.parseInt(item.sortOrder, 10),
                })),
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
            <AdminPageHeader
                title="Promosyonlar"
                description="Bundle, otomatik kampanya ve kupon akislarini ayni operasyon panelinde yonetin."
                meta={`${bundles.length + discounts.length + coupons.length} kayit`}
                action={null}
            />

            <AdminToolbar>
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Bundle, kampanya veya kupon ara..."
                        className="pl-9"
                    />
                </div>
                <AdminToolbarStats
                    stats={[
                        { label: "bundle", value: String(filteredBundles.length) },
                        { label: "kampanya", value: String(filteredDiscounts.length) },
                        { label: "kupon", value: String(filteredCoupons.length) },
                    ]}
                />
            </AdminToolbar>

            {loading ? (
                <AdminTableShell loading title="Promosyon verileri" description="Admin kaynaklari yukleniyor.">
                    <div />
                </AdminTableShell>
            ) : null}
            {loadError ? (
                <Card>
                    <CardContent className="p-6 text-sm text-red-500">{loadError}</CardContent>
                </Card>
            ) : null}

            {!loading && !loadError ? (
            <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Bundle Tanimlari</CardTitle>
                        <Button size="sm" onClick={() => { setEditingBundleId(null); setBundleForm(emptyBundleForm); }} className="gap-2"><Plus size={14} />Yeni</Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {filteredBundles.length === 0 ? (
                            <AdminEmptyState
                                title="Bundle bulunamadi"
                                description="Arama sonucunda gosterilecek bundle kaydi yok."
                            />
                        ) : null}
                        {filteredBundles.map((bundle) => (
                            <div key={bundle.id} className="rounded-2xl border border-border p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{bundle.name}</h3><PromotionTypeBadge label={bundle.isActive ? "aktif" : "pasif"} /></div>
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
                        <BundleEditor
                            form={bundleForm}
                            itemOptions={itemOptions}
                            editing={editingBundleId !== null}
                            saving={saving}
                            onChange={(patch) => setBundleForm((current) => ({ ...current, ...patch }))}
                            onItemChange={(index, patch) => setBundleForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }))}
                            onAddItem={() => setBundleForm((current) => ({ ...current, items: [...current.items, { shopItemId: "", sortOrder: String(current.items.length) }] }))}
                            onRemoveItem={(index) => setBundleForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}
                            onSubmit={() => void saveBundle()}
                            onCancel={() => { setEditingBundleId(null); setBundleForm(emptyBundleForm); }}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Indirim Kampanyalari</CardTitle>
                        <Button size="sm" onClick={() => { setEditingDiscountId(null); setDiscountForm(emptyDiscountForm); }} className="gap-2"><Plus size={14} />Yeni</Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {filteredDiscounts.length === 0 ? (
                            <AdminEmptyState
                                title="Kampanya bulunamadi"
                                description="Arama sonucunda gosterilecek indirim kampanyasi yok."
                            />
                        ) : null}
                        {filteredDiscounts.map((discount) => (
                            <div key={discount.id} className="rounded-2xl border border-border p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{discount.name}</h3><PromotionTypeBadge label={discount.targetType} /></div>
                                        <p className="font-mono text-xs text-muted-foreground">{discount.code}</p>
                                        <p className="mt-2 text-sm text-muted-foreground">{discount.discountType === "percentage" ? `%${discount.percentageOff} indirim` : `${discount.fixedCoinOff} coin indirim`}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Kullanim: {discount.usedCount}{discount.usageLimit ? ` / ${discount.usageLimit}` : ""}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingDiscountId(discount.id); setDiscountForm({ code: discount.code, name: discount.name, description: discount.description ?? "", targetType: discount.targetType, discountType: discount.discountType, percentageOff: discount.percentageOff ? String(discount.percentageOff) : "", fixedCoinOff: discount.fixedCoinOff ? String(discount.fixedCoinOff) : "", shopItemId: discount.shopItemId ? String(discount.shopItemId) : "", bundleId: discount.bundleId ? String(discount.bundleId) : "", usageLimit: discount.usageLimit ? String(discount.usageLimit) : "", startsAt: toDateTimeLocal(discount.startsAt), endsAt: toDateTimeLocal(discount.endsAt), isActive: discount.isActive, stackableWithCoupon: discount.stackableWithCoupon }); }}><Edit2 size={14} /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => void deactivateEntry("discounts", discount.id)}><Trash2 size={14} /></Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <DiscountEditor
                            form={discountForm}
                            itemOptions={itemOptions}
                            bundleOptions={bundleOptions}
                            editing={editingDiscountId !== null}
                            saving={saving}
                            onChange={(patch) => setDiscountForm((current) => ({ ...current, ...patch }))}
                            onSubmit={() => void saveDiscount()}
                            onCancel={() => { setEditingDiscountId(null); setDiscountForm(emptyDiscountForm); }}
                        />
                    </CardContent>
                </Card>
            </div>
            ) : null}

            {!loading && !loadError ? (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Kupon Kodlari</CardTitle>
                    <Button size="sm" onClick={() => { setEditingCouponId(null); setCouponForm(emptyCouponForm); }} className="gap-2"><Plus size={14} />Yeni</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {filteredCoupons.length === 0 ? (
                        <AdminEmptyState
                            title="Kupon bulunamadi"
                            description="Arama sonucunda gosterilecek kupon kaydi yok."
                        />
                    ) : null}
                    {filteredCoupons.map((coupon) => (
                        <div key={coupon.id} className="rounded-2xl border border-border p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{coupon.name}</h3><PromotionTypeBadge label={coupon.targetType} /></div>
                                    <p className="font-mono text-xs text-muted-foreground">{coupon.code}</p>
                                    <p className="mt-2 text-sm text-muted-foreground">{coupon.discountType === "percentage" ? `%${coupon.percentageOff} indirim` : `${coupon.fixedCoinOff} coin indirim`}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Kullanim: {coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingCouponId(coupon.id); setCouponForm({ code: coupon.code, name: coupon.name, description: coupon.description ?? "", targetType: coupon.targetType, discountType: coupon.discountType, percentageOff: coupon.percentageOff ? String(coupon.percentageOff) : "", fixedCoinOff: coupon.fixedCoinOff ? String(coupon.fixedCoinOff) : "", shopItemId: coupon.shopItemId ? String(coupon.shopItemId) : "", bundleId: coupon.bundleId ? String(coupon.bundleId) : "", usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "", startsAt: toDateTimeLocal(coupon.startsAt), endsAt: toDateTimeLocal(coupon.endsAt), isActive: coupon.isActive }); }}><Edit2 size={14} /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => void deactivateEntry("coupons", coupon.id)}><Trash2 size={14} /></Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <CouponEditor
                        form={couponForm}
                        itemOptions={itemOptions}
                        bundleOptions={bundleOptions}
                        editing={editingCouponId !== null}
                        saving={saving}
                        onChange={(patch) => setCouponForm((current) => ({ ...current, ...patch }))}
                        onSubmit={() => void saveCoupon()}
                        onCancel={() => { setEditingCouponId(null); setCouponForm(emptyCouponForm); }}
                    />
                </CardContent>
            </Card>
            ) : null}
        </div>
    );
}
