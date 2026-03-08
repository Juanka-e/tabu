"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { UserNav } from "@/components/user/user-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EquippedSlots, InventoryItemView, UserInventoryResponse } from "@/types/economy";

const emptyEquippedSlots: EquippedSlots = {
  avatarItemId: null,
  frameItemId: null,
  cardBackItemId: null,
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [ownedItems, setOwnedItems] = useState<InventoryItemView[]>([]);
  const [equipped, setEquipped] = useState<EquippedSlots>(emptyEquippedSlots);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const meResponse = await fetch("/api/user/me", { cache: "no-store" });
        if (!meResponse.ok) {
          setLoading(false);
          return;
        }

        const me = (await meResponse.json()) as UserInventoryResponse;
        setDisplayName(me.profile.displayName || me.name || "");
        setBio(me.profile.bio || "");
        setOwnedItems(me.items);
        setEquipped({
          avatarItemId: me.profile.avatarItemId,
          frameItemId: me.profile.frameItemId,
          cardBackItemId: me.profile.cardBackItemId,
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const grouped = useMemo(() => {
    return {
      avatar: ownedItems.filter((item) => item.type === "avatar"),
      frame: ownedItems.filter((item) => item.type === "frame"),
      card_back: ownedItems.filter((item) => item.type === "card_back"),
    };
  }, [ownedItems]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio }),
      });

      if (!response.ok) {
        window.alert("Profil guncellenemedi.");
        return;
      }

      window.alert("Profil kaydedildi.");
    } finally {
      setSaving(false);
    }
  };

  const equip = async (shopItemId: number) => {
    const response = await fetch("/api/store/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopItemId }),
    });

    if (!response.ok) {
      window.alert("Kusanma islemi basarisiz.");
      return;
    }

    const payload = (await response.json()) as { equippedSlots: EquippedSlots };
    setEquipped(payload.equippedSlots);
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#fff7ed,_#fafafa_35%,_#ecfeff)] dark:bg-[radial-gradient(circle_at_top_right,_#1f2937,_#020617_35%,_#052e16)]">
      <UserNav username={session.user.name || "Oyuncu"} />
      <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-5 space-y-3">
          <h1 className="text-2xl font-black">Profil</h1>
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Gorunen ad" maxLength={60} />
          <Textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Kisa bio" maxLength={300} rows={3} />
          <Button onClick={() => void saveProfile()} disabled={saving}>{saving ? "Kaydediliyor..." : "Profili Kaydet"}</Button>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <CosmeticColumn
            title="Avatar"
            items={grouped.avatar}
            activeId={equipped.avatarItemId}
            loading={loading}
            onEquip={equip}
          />
          <CosmeticColumn
            title="Cerceve"
            items={grouped.frame}
            activeId={equipped.frameItemId}
            loading={loading}
            onEquip={equip}
          />
          <CosmeticColumn
            title="Kart Arkasi"
            items={grouped.card_back}
            activeId={equipped.cardBackItemId}
            loading={loading}
            onEquip={equip}
          />
        </section>
      </main>
    </div>
  );
}

function CosmeticColumn({
  title,
  items,
  activeId,
  onEquip,
  loading,
}: {
  title: string;
  items: InventoryItemView[];
  activeId: number | null;
  loading: boolean;
  onEquip: (id: number) => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-sm text-zinc-500">Yukleniyor...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">Bu kategoride urun yok.</p>
        ) : (
          items.map((item) => (
            <div key={item.inventoryItemId} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-zinc-500">{item.rarity}</p>
              </div>
              <Button
                size="sm"
                variant={activeId === item.shopItemId ? "default" : "outline"}
                onClick={() => onEquip(item.shopItemId)}
              >
                {activeId === item.shopItemId ? "Kusaniyor" : "Kusan"}
              </Button>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
