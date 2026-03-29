"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Eye, PackageOpen, X } from "lucide-react";
import { DashboardEmptyState, DashboardPageShell, DashboardSection } from "@/components/game/dashboard-page-shell";
import { CosmeticLargePreview, CosmeticMiniPreview, formatCosmeticTypeLabel } from "@/components/game/cosmetic-preview";
import { CoinBadge } from "@/components/ui/coin-badge";
import { WALLET_UPDATED_EVENT } from "@/lib/wallet-events";
import type {
  EquippedSlots,
  InventoryItemView,
  StoreItemRarity,
  StoreItemType,
  UserInventoryResponse,
} from "@/types/economy";

const rarityColor: Record<StoreItemRarity, string> = {
  common: "bg-slate-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
};

const rarityBorder: Record<StoreItemRarity, string> = {
  common: "border-slate-300/30 dark:border-slate-700/30",
  rare: "border-blue-300/30 dark:border-blue-700/30",
  epic: "border-purple-400/30 dark:border-purple-600/30",
  legendary: "border-yellow-400/30 dark:border-yellow-600/30",
};

const rarityGlow: Record<StoreItemRarity, string> = {
  common: "",
  rare: "",
  epic: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
  legendary: "shadow-[0_0_15px_rgba(234,179,8,0.3)]",
};

const tabs: { id: StoreItemType; label: string }[] = [
  { id: "avatar", label: "Avatarlar" },
  { id: "frame", label: "Çerçeveler" },
  { id: "card_back", label: "Kart Arkaları" },
  { id: "card_face", label: "Kart Önleri" },
];

function isItemEquipped(item: InventoryItemView, equippedSlots: EquippedSlots): boolean {
  if (item.type === "avatar") {
    return equippedSlots.avatarItemId === item.shopItemId;
  }
  if (item.type === "frame") {
    return equippedSlots.frameItemId === item.shopItemId;
  }
  if (item.type === "card_back") {
    return equippedSlots.cardBackItemId === item.shopItemId;
  }
  return equippedSlots.cardFaceItemId === item.shopItemId;
}

export function InventoryContent() {
  const { data: session } = useSession();
  const [activeType, setActiveType] = useState<StoreItemType>("avatar");
  const [items, setItems] = useState<InventoryItemView[]>([]);
  const [previewItem, setPreviewItem] = useState<InventoryItemView | null>(null);
  const [equipBusyId, setEquipBusyId] = useState<number | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [equippedSlots, setEquippedSlots] = useState<EquippedSlots>({
    avatarItemId: null,
    frameItemId: null,
    cardBackItemId: null,
    cardFaceItemId: null,
  });

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const load = async () => {
      try {
        const response = await fetch("/api/user/inventory", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as UserInventoryResponse;
        setItems(payload.items);
        setCoinBalance(payload.wallet.coinBalance);
        setEquippedSlots({
          avatarItemId: payload.profile.avatarItemId,
          frameItemId: payload.profile.frameItemId,
          cardBackItemId: payload.profile.cardBackItemId,
          cardFaceItemId: payload.profile.cardFaceItemId,
        });
      } catch {
        // Keep defaults when fetch fails.
      }
    };

    void load();

    const handleWalletUpdated = () => {
      void load();
    };

    window.addEventListener(WALLET_UPDATED_EVENT, handleWalletUpdated);
    return () => {
      window.removeEventListener(WALLET_UPDATED_EVENT, handleWalletUpdated);
    };
  }, [session]);

  useEffect(() => {
    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        equipped: isItemEquipped(item, equippedSlots),
      }))
    );
    setPreviewItem((current) => {
      if (!current) {
        return null;
      }

      return {
        ...current,
        equipped: isItemEquipped(current, equippedSlots),
      };
    });
  }, [equippedSlots]);

  const filteredItems = useMemo(
    () => items.filter((item) => item.type === activeType),
    [activeType, items]
  );

  const handleEquip = async (item: InventoryItemView) => {
    if (equipBusyId !== null || item.equipped) {
      return;
    }

    setEquipBusyId(item.shopItemId);
    try {
      const response = await fetch("/api/store/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopItemId: item.shopItemId }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { equippedSlots: EquippedSlots };
      setEquippedSlots(payload.equippedSlots);
    } catch {
      // Keep previous state on failure.
    } finally {
      setEquipBusyId(null);
    }
  };

  return (
    <DashboardPageShell
      eyebrow="Koleksiyon"
      title="Envanter"
      description="Sahip olduğun kozmetikleri, aktif slotları ve hızlı önizlemeyi tek yerde gör."
      action={<CoinBadge value={coinBalance} className="rounded-2xl px-4 py-3" valueClassName="text-xl" />}
    >
      <div className="space-y-6">
        <DashboardSection
          title="Sahip Olduğun Kozmetikler"
          description="Kategori değiştir, ürünleri incele ve panelden çıkmadan kullan."
          action={
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveType(tab.id);
                    setPreviewItem(null);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                    activeType === tab.id
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
          contentClassName="space-y-5"
        >
          <div className="flex min-h-0 gap-6 overflow-hidden">
            <div className="flex-1 overflow-y-auto pb-2">
              {filteredItems.length === 0 ? (
                <DashboardEmptyState
                  title="Bu kategoride henüz ürün yok"
                  description="Bu kategoride kozmetik kazandığında burada görünür, kullanabilir ve hızlı önizleme yapabilirsin."
                  icon={<PackageOpen className="h-5 w-5" />}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.inventoryItemId}
                      className={`group relative flex flex-col rounded-[24px] border p-3 transition-all hover:-translate-y-0.5 hover:bg-white/85 dark:hover:bg-slate-950/60 ${rarityBorder[item.rarity]} ${rarityGlow[item.rarity]} ${item.equipped ? "ring-2 ring-blue-500/40" : ""}`}
                    >
                      <div className="relative mb-3 flex aspect-[0.95/1] items-center justify-center overflow-hidden rounded-[18px] border border-white/40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.48),_transparent_55%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(226,232,240,0.85))] p-4 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.92))]">
                        <div
                          className={`absolute right-2 top-2 z-10 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white ${rarityColor[item.rarity]}`}
                        >
                          {item.rarity}
                        </div>
                        <CosmeticMiniPreview item={item} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">{item.name}</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {formatCosmeticTypeLabel(item.type)} • {new Date(item.acquiredAt).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => setPreviewItem(item)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-900"
                          type="button"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Önizle
                        </button>
                        <button
                          onClick={() => void handleEquip(item)}
                          disabled={item.equipped || equipBusyId !== null}
                          className={`flex-1 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                            item.equipped
                              ? "bg-blue-500 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-blue-500 hover:text-white dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-600"
                          }`}
                          type="button"
                        >
                          {item.equipped ? "Kullanılıyor" : equipBusyId === item.shopItemId ? "Giydiriliyor..." : "Kullan"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DashboardSection>
      </div>
      {previewItem ? (
        <InventoryPreviewModal selectedItem={previewItem} onClose={() => setPreviewItem(null)} />
      ) : null}
    </DashboardPageShell>
  );
}

function InventoryPreviewCard({
  selectedItem,
  className,
}: {
  selectedItem: InventoryItemView;
  className?: string;
}) {
  return (
      <div className={`rounded-[28px] border border-white/60 bg-white/72 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/45 ${className ?? ""}`}>
        <h3 className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Önizleme
        </h3>
      <div className="relative mb-6 overflow-hidden rounded-[24px] border border-slate-200/70 bg-slate-100 shadow-inner dark:border-slate-700/80 dark:bg-slate-950">
        <CosmeticLargePreview item={selectedItem} />
      </div>
      <div className="space-y-3">
        <div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white">{selectedItem.name}</h4>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1)}{" "}
            {formatCosmeticTypeLabel(selectedItem.type)}
          </p>
        </div>
        <div
          className={`rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ${
            selectedItem.rarity === "legendary"
              ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/30 dark:bg-yellow-950/20 dark:text-yellow-300"
              : selectedItem.rarity === "epic"
                ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/30 dark:bg-purple-950/20 dark:text-purple-300"
                : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300"
          }`}
        >
          {selectedItem.equipped ? "Aktif Slot" : "Kullanmaya Hazır"}
        </div>
      </div>
    </div>
  );
}

function InventoryPreviewModal({
  selectedItem,
  onClose,
}: {
  selectedItem: InventoryItemView;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,251,0.98),rgba(238,244,255,0.98))] p-5 shadow-[0_32px_90px_-50px_rgba(15,23,42,0.8)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.96),rgba(23,37,84,0.95))] md:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
        <InventoryPreviewCard selectedItem={selectedItem} />
      </div>
    </div>
  );
}
