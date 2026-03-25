"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { useSession } from "next-auth/react";
import { PackageOpen } from "lucide-react";
import { DashboardEmptyState, DashboardPageShell, DashboardSection } from "@/components/game/dashboard-page-shell";
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
  { id: "avatar", label: "Avatars" },
  { id: "frame", label: "Frames" },
  { id: "card_back", label: "Card Backs" },
  { id: "card_face", label: "Card Faces" },
];

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

function getItemInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
}

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
  const [selectedItem, setSelectedItem] = useState<InventoryItemView | null>(null);
  const [equipBusyId, setEquipBusyId] = useState<number | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [equippedSlots, setEquippedSlots] = useState<EquippedSlots>({
    avatarItemId: null,
    frameItemId: null,
    cardBackItemId: null,
    cardFaceItemId: null,
  });
  const [displayName, setDisplayName] = useState("Player");

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
        setDisplayName(payload.profile.displayName || payload.name || session.user.name || "Player");
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
    setSelectedItem((current) => {
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
      eyebrow="Collection"
      title="Inventory"
      description="Owned cosmetics, equipped slots and quick previews in a single surface."
      action={<CoinBadge value={coinBalance} className="rounded-2xl px-4 py-3" valueClassName="text-xl" />}
    >
      <div className="space-y-6">
        <DashboardSection
          title="Owned Cosmetics"
          description="Switch categories, inspect items and equip them without leaving the dashboard."
          action={
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveType(tab.id);
                    setSelectedItem(null);
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
          {selectedItem ? <InventoryPreviewCard selectedItem={selectedItem} displayName={displayName} className="xl:hidden" /> : null}
          <div className="flex min-h-0 gap-6 overflow-hidden">
            <div className="flex-1 overflow-y-auto pb-2">
              {filteredItems.length === 0 ? (
                <DashboardEmptyState
                  title="No owned items here yet"
                  description="Once you unlock cosmetics in this category, they will appear here with equip actions and quick previews."
                  icon={<PackageOpen className="h-5 w-5" />}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.inventoryItemId}
                      onClick={() => setSelectedItem(item)}
                      className={`group relative flex cursor-pointer flex-col rounded-[24px] border p-3 transition-all hover:-translate-y-0.5 hover:bg-white/85 dark:hover:bg-slate-950/60 ${rarityBorder[item.rarity]} ${rarityGlow[item.rarity]} ${item.equipped ? "ring-2 ring-blue-500/40" : ""}`}
                    >
                      <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/60 dark:to-slate-900/60">
                        <div
                          className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white ${rarityColor[item.rarity]}`}
                        >
                          {item.rarity}
                        </div>
                        {item.imageUrl ? (
                          <Image
                            loader={passthroughImageLoader}
                            unoptimized
                            src={item.imageUrl}
                            alt={item.name}
                            width={72}
                            height={72}
                            className="h-[72px] w-[72px] rounded-full object-cover shadow-lg transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-black text-white shadow-lg">
                            {getItemInitial(item.name)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">{item.name}</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {item.source} • {new Date(item.acquiredAt).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleEquip(item);
                        }}
                        disabled={item.equipped || equipBusyId !== null}
                        className={`mt-4 w-full rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                          item.equipped
                            ? "bg-blue-500 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-blue-500 hover:text-white dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-600"
                        }`}
                        type="button"
                      >
                        {item.equipped ? "Equipped" : equipBusyId === item.shopItemId ? "Equipping..." : "Equip"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedItem ? (
              <InventoryPreviewCard
                selectedItem={selectedItem}
                displayName={displayName}
                className="hidden xl:flex xl:w-72 xl:flex-shrink-0"
              />
            ) : null}
          </div>
        </DashboardSection>
      </div>
    </DashboardPageShell>
  );
}

function InventoryPreviewCard({
  selectedItem,
  displayName,
  className,
}: {
  selectedItem: InventoryItemView;
  displayName: string;
  className?: string;
}) {
  return (
    <div className={`rounded-[28px] border border-white/60 bg-white/72 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/45 ${className ?? ""}`}>
      <h3 className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        Preview
      </h3>
      <div className="relative mb-6 flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-[24px] border border-slate-200/70 bg-slate-100 p-4 shadow-inner dark:border-slate-700/80 dark:bg-slate-950">
        <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-purple-500 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl ring-4 ring-purple-500/20">
          {selectedItem.imageUrl ? (
            <Image
              loader={passthroughImageLoader}
              unoptimized
              src={selectedItem.imageUrl}
              alt={selectedItem.name}
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl text-white">{getItemInitial(selectedItem.name)}</span>
          )}
        </div>
        <div className="text-center">
          <h4 className="text-lg font-black text-slate-900 dark:text-white">{displayName}</h4>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <h4 className="text-lg font-black text-slate-900 dark:text-white">{selectedItem.name}</h4>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1)}{" "}
            {selectedItem.type.replace("_", " ")}
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
          {selectedItem.equipped ? "Active slot" : "Ready to equip"}
        </div>
      </div>
    </div>
  );
}
