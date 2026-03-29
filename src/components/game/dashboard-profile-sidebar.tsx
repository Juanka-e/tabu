"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { useSession } from "next-auth/react";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { CosmeticMiniPreview } from "@/components/game/cosmetic-preview";
import { CoinMark } from "@/components/ui/coin-badge";
import { WALLET_UPDATED_EVENT } from "@/lib/wallet-events";
import type {
  CatalogStoreItemView,
  DashboardDataResponse,
  InventoryItemView,
  StoreCatalogResponse,
  UserInventoryResponse,
} from "@/types/economy";
import type { DashboardTab } from "./dashboard-nav";

interface ProfileSidebarProps {
  onTabChange: (tab: DashboardTab) => void;
}

interface SidebarState {
  displayName: string;
  coinBalance: number;
  totalMatches: number;
  winRate: number;
  equippedItems: InventoryItemView[];
}

const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

function getInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "P";
}

function sortStoreItemsByPriority(items: CatalogStoreItemView[]): CatalogStoreItemView[] {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function shuffleItems(items: CatalogStoreItemView[]): CatalogStoreItemView[] {
  const nextItems = [...items];
  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = nextItems[index];
    nextItems[index] = nextItems[swapIndex];
    nextItems[swapIndex] = current;
  }

  return nextItems;
}

function buildDiscoveryRail(items: CatalogStoreItemView[]): CatalogStoreItemView[] {
  const unownedItems = items.filter((item) => !item.owned);
  if (unownedItems.length === 0) {
    return [];
  }

  const featuredItems = sortStoreItemsByPriority(unownedItems.filter((item) => item.isFeatured));
  const candidatePool =
    featuredItems.length > 0 ? featuredItems.slice(0, 8) : sortStoreItemsByPriority(unownedItems).slice(0, 8);

  return shuffleItems(candidatePool).slice(0, 6);
}

export function DashboardProfileSidebar({ onTabChange }: ProfileSidebarProps) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<SidebarState | null>(null);
  const [discoveryItems, setDiscoveryItems] = useState<CatalogStoreItemView[]>([]);
  const [radarOffset, setRadarOffset] = useState(0);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    const load = async () => {
      try {
        const [dashboardResponse, inventoryResponse, catalogResponse] = await Promise.all([
          fetch("/api/user/dashboard", { cache: "no-store" }),
          fetch("/api/user/me", { cache: "no-store" }),
          fetch("/api/store/catalog", { cache: "no-store" }),
        ]);

        if (!dashboardResponse.ok || !inventoryResponse.ok || !catalogResponse.ok) {
          return;
        }

        const dashboard = (await dashboardResponse.json()) as DashboardDataResponse;
        const inventory = (await inventoryResponse.json()) as UserInventoryResponse;
        const catalog = (await catalogResponse.json()) as StoreCatalogResponse;

        setProfile({
          displayName: inventory.profile.displayName || inventory.name || session.user.name || "Player",
          coinBalance: dashboard.coinBalance,
          totalMatches: dashboard.totalMatches,
          winRate: dashboard.winRate,
          equippedItems: inventory.items.filter((item) => item.equipped),
        });
        setDiscoveryItems(buildDiscoveryRail(catalog.items));
      } catch {
        // Sidebar can render fallback values.
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

  const name = profile?.displayName || session?.user?.name || "Player";
  const initial = getInitial(name);
  const quickEquipItems = useMemo(() => (profile?.equippedItems ?? []).slice(0, 3), [profile?.equippedItems]);
  const rotatedDiscoveryItems = useMemo(() => {
    if (discoveryItems.length === 0) {
      return [];
    }

    const start = radarOffset % discoveryItems.length;
    return [...discoveryItems.slice(start), ...discoveryItems.slice(0, start)];
  }, [discoveryItems, radarOffset]);
  const radarLeadItem = rotatedDiscoveryItems[0] ?? null;
  const radarSecondaryItems = useMemo(() => rotatedDiscoveryItems.slice(1, 4), [rotatedDiscoveryItems]);

  useEffect(() => {
    if (discoveryItems.length <= 1) return;

    const interval = window.setInterval(() => {
      setRadarOffset((current) => (current + 1) % discoveryItems.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [discoveryItems.length]);

  return (
    <aside className="hidden h-full min-w-[320px] w-[340px] flex-col border-l border-slate-200/60 bg-white/55 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/35 xl:flex">
      <div className="flex flex-col p-6 text-center">
        <div className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] dark:border-slate-800/70 dark:bg-slate-950/55">
          <div className="group relative mb-4 mx-auto w-fit cursor-pointer">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-black text-white shadow-xl ring-2 ring-white/50 transition-transform group-hover:scale-105 dark:ring-slate-700">
              {initial}
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-800 dark:text-white">{name}</h2>
          <p className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-blue-500 dark:text-blue-400">
            {profile?.totalMatches ?? 0} maç oynandı
          </p>

          <div className="mb-6 w-full rounded-[24px] border border-slate-200/60 bg-slate-100/60 p-4 dark:border-slate-800/70 dark:bg-slate-900/70">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[20px] border border-slate-200/50 bg-white/80 p-3 dark:border-slate-800/70 dark:bg-slate-950/70">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Kazanma
                </div>
                <div className="text-lg font-black text-slate-800 dark:text-white">{profile?.winRate ?? 0}%</div>
              </div>
              <div className="rounded-[20px] border border-slate-200/50 bg-white/80 p-3 dark:border-slate-800/70 dark:bg-slate-950/70">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Coin
                </div>
                <div className="flex items-center justify-center gap-1 text-lg font-black text-slate-800 dark:text-white">
                  {profile?.coinBalance ?? 0}
                  <CoinMark className="h-5 w-5 ring-0 shadow-none" iconClassName="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full text-left">
            <h3 className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Hızlı Kullanım
            </h3>
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
              {quickEquipItems.map((item) => (
                <button
                  key={item.inventoryItemId}
                  onClick={() => onTabChange("inventory")}
                  className="ring-indigo-400 flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md transition-all hover:ring-2"
                  title={item.name}
                  type="button"
                >
                  {item.imageUrl ? (
                    <Image
                      loader={passthroughImageLoader}
                      unoptimized
                      src={item.imageUrl}
                      alt={item.name}
                      width={48}
                      height={48}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <span className="font-black">{getInitial(item.name)}</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => onTabChange("inventory")}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-200 text-slate-400 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
                type="button"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="mt-6 w-full text-left">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  <Sparkles size={12} />
                  Mağaza Radarı
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Önerilen ürünler mağaza sırasına göre burada döner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onTabChange("shop")}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Mağaza
                <ArrowUpRight size={11} />
              </button>
            </div>

            {discoveryItems.length === 0 ? (
              <button
                type="button"
                onClick={() => onTabChange("shop")}
                className="w-full rounded-2xl border border-dashed border-slate-300/70 bg-white/40 px-4 py-4 text-left text-xs font-medium text-slate-500 transition hover:bg-white/60 dark:border-slate-700/70 dark:bg-slate-900/30 dark:text-slate-400 dark:hover:bg-slate-900/50"
              >
                Şu anda gösterilecek ürün bulunmuyor. Yeni koleksiyonlar geldiğinde burada görünür.
              </button>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white/85 to-slate-100/75 p-3 shadow-inner dark:border-slate-700/60 dark:from-slate-900/70 dark:to-slate-950/70">
                {radarLeadItem ? (
                  <button
                    type="button"
                    onClick={() => onTabChange("shop")}
                    className="group relative flex w-full items-center gap-3 overflow-hidden rounded-[22px] border border-white/70 bg-white/85 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/85"
                  >
                    <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.48),_transparent_55%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(226,232,240,0.85))] p-2 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.92))]">
                      <CosmeticMiniPreview item={radarLeadItem} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate text-sm font-black text-slate-800 dark:text-white">
                          {radarLeadItem.name}
                        </div>
                        {radarLeadItem.badgeText ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {radarLeadItem.badgeText}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold capitalize text-slate-500 dark:text-slate-400">
                        {radarLeadItem.type.replace("_", " ")}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-xs font-black text-amber-500">
                          {radarLeadItem.pricing.finalPriceCoin.toLocaleString()}
                          <CoinMark className="h-4 w-4 ring-0 shadow-none" iconClassName="h-2.5 w-2.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          İncele
                        </span>
                      </div>
                    </div>
                  </button>
                ) : null}
                <div className="space-y-2">
                  {radarSecondaryItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange("shop")}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/72 p-2.5 text-left transition hover:bg-white dark:border-slate-800/80 dark:bg-slate-900/75 dark:hover:bg-slate-900"
                    >
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.48),_transparent_55%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(226,232,240,0.85))] p-1.5 dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.92))]">
                        <CosmeticMiniPreview item={item} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-800 dark:text-white">
                          {item.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-black text-amber-500">
                          {item.pricing.finalPriceCoin.toLocaleString()}
                          <CoinMark className="h-3.5 w-3.5 ring-0 shadow-none" iconClassName="h-2 w-2" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-200/60 bg-slate-50/60 p-6 dark:border-slate-800/70 dark:bg-slate-950/45">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Panel Erişimi</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Oyun içi + tam sayfa</span>
        </div>
      </div>
    </aside>
  );
}
