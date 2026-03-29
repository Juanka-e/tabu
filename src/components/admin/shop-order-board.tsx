"use client";

import { useMemo } from "react";
import { GripVertical, Sparkles, Stars } from "lucide-react";
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
    ADMIN_RARITY_BADGE_CLASS,
    ADMIN_RARITY_SURFACE_CLASS,
    buildShopItemSortUpdates,
} from "@/lib/store/shop-admin";
import type { StoreItemRarity, StoreItemType } from "@/types/economy";

interface OrderableShopItem {
    id: number;
    code: string;
    name: string;
    type: StoreItemType;
    rarity: StoreItemRarity;
    sortOrder: number;
    badgeText: string | null;
    isFeatured: boolean;
    isActive: boolean;
}

interface ShopOrderBoardProps {
    items: OrderableShopItem[];
    saving: boolean;
    onReorder: (updates: Array<{ id: number; sortOrder: number }>) => void;
}

function SortableShopOrderCard({ item }: { item: OrderableShopItem }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "rounded-2xl border p-3 shadow-sm transition",
                ADMIN_RARITY_SURFACE_CLASS[item.rarity],
                isDragging ? "scale-[1.02] shadow-xl ring-2 ring-blue-400/50" : "hover:-translate-y-0.5"
            )}
        >
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="mt-0.5 rounded-xl border border-current/10 bg-white/60 p-2 text-current/70 transition hover:text-current dark:bg-slate-950/40"
                    aria-label={`${item.name} siralama tutamaci`}
                >
                    <GripVertical size={14} />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-black">{item.name}</div>
                        <span
                            className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em]",
                                ADMIN_RARITY_BADGE_CLASS[item.rarity]
                            )}
                        >
                            {item.rarity}
                        </span>
                        {item.isFeatured ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-700 dark:text-fuchsia-300">
                                <Stars size={10} />
                                Spotlight
                            </span>
                        ) : null}
                        {item.badgeText ? (
                            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                                {item.badgeText}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
                        <span>{item.type.replace("_", " ")}</span>
                        <span>{item.code}</span>
                    </div>
                </div>
                <div className="rounded-xl bg-white/60 px-2.5 py-1 text-[11px] font-black tabular-nums shadow-sm dark:bg-slate-950/40">
                    #{item.sortOrder}
                </div>
            </div>
        </div>
    );
}

export function ShopOrderBoard({ items, saving, onReorder }: ShopOrderBoardProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const sortableItems = useMemo(
        () => items.filter((item) => item.isActive).sort((left, right) => left.sortOrder - right.sortOrder),
        [items]
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = sortableItems.findIndex((item) => item.id === active.id);
        const newIndex = sortableItems.findIndex((item) => item.id === over.id);
        if (oldIndex < 0 || newIndex < 0) {
            return;
        }

        const nextItems = arrayMove(sortableItems, oldIndex, newIndex).map((item, index) => ({
            ...item,
            sortOrder: index * 10,
        }));

        onReorder(buildShopItemSortUpdates(nextItems.map((item) => item.id)));
    };

    return (
        <section className="rounded-[28px] border border-border/70 bg-gradient-to-br from-white via-slate-50 to-white p-5 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">
                        <Sparkles size={12} />
                        Catalog Order
                    </div>
                    <h2 className="mt-3 text-xl font-black tracking-tight text-foreground">
                        Aktif urunleri surukleyip birak
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Magaza grid sirasini bu panel belirler. Baslangicta rarity odakli gidiyoruz; sezon mantigini simdilik eklemiyorum.
                    </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-right shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Active Items
                    </div>
                    <div className="mt-1 text-lg font-black text-foreground">
                        {sortableItems.length}
                    </div>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableItems.map((item) => item.id)} strategy={rectSortingStrategy}>
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {sortableItems.map((item) => (
                            <SortableShopOrderCard key={item.id} item={item} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                <span>Pasif urunler bu alana dahil degil. Once aktiflestir, sonra sirala.</span>
                <span className="font-semibold text-foreground">{saving ? "Kaydediliyor..." : "Surukle birak aktif"}</span>
            </div>
        </section>
    );
}
