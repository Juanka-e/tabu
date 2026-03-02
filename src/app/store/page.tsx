"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { UserNav } from "@/components/user/user-nav";
import { Button } from "@/components/ui/button";

type StoreItem = {
  id: number;
  name: string;
  type: "avatar" | "frame" | "card_back";
  rarity: "common" | "rare" | "epic" | "legendary";
  priceCoin: number;
  imageUrl: string;
};

export default function StorePage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [coin, setCoin] = useState(0);
  const [busyId, setBusyId] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [itemRes, dashRes] = await Promise.all([
        fetch("/api/store/items", { cache: "no-store" }),
        fetch("/api/user/dashboard", { cache: "no-store" }),
      ]);

      if (itemRes.ok) {
        const data = (await itemRes.json()) as { items: StoreItem[] };
        setItems(data.items);
      }

      if (dashRes.ok) {
        const data = (await dashRes.json()) as { coinBalance: number };
        setCoin(data.coinBalance);
      }
    };
    void load();
  }, []);

  const grouped = useMemo(() => {
    return {
      avatar: items.filter((item) => item.type === "avatar"),
      frame: items.filter((item) => item.type === "frame"),
      card_back: items.filter((item) => item.type === "card_back"),
    };
  }, [items]);

  const buy = async (shopItemId: number) => {
    setBusyId(shopItemId);
    const res = await fetch("/api/store/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopItemId }),
    });

    const data = await res.json();
    setBusyId(0);

    if (!res.ok) {
      alert(data.error || "Satin alma basarisiz.");
      return;
    }

    setCoin(data.coinBalance ?? coin);
    alert("Urun envantere eklendi.");
  };

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfccb,_#f8fafc_40%,_#dbeafe)] dark:bg-[radial-gradient(circle_at_top,_#14532d,_#020617_40%,_#1e293b)]">
      <UserNav username={session.user.name || "Oyuncu"} />
      <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Coin Bakiyesi</p>
            <p className="text-3xl font-black">{coin}</p>
          </div>
          <p className="text-sm text-zinc-500">Kozmetik urunler oyun dengesini etkilemez.</p>
        </section>

        <Category title="Avatar" items={grouped.avatar} busyId={busyId} coin={coin} onBuy={buy} />
        <Category title="Cerceve" items={grouped.frame} busyId={busyId} coin={coin} onBuy={buy} />
        <Category title="Kart Arkasi" items={grouped.card_back} busyId={busyId} coin={coin} onBuy={buy} />
      </main>
    </div>
  );
}

function Category({
  title,
  items,
  busyId,
  coin,
  onBuy,
}: {
  title: string;
  items: StoreItem[];
  busyId: number;
  coin: number;
  onBuy: (id: number) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const disabled = busyId === item.id || coin < item.priceCoin;
          return (
            <article key={item.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-4 space-y-3">
              <div className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                {item.imageUrl}
              </div>
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-zinc-500">{item.rarity}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.priceCoin} coin</span>
                <Button size="sm" disabled={disabled} onClick={() => onBuy(item.id)}>
                  {busyId === item.id ? "..." : "Satin Al"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}