"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { UserNav } from "@/components/user/user-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OwnedItem = {
  id: number;
  shopItem: {
    id: number;
    name: string;
    type: "avatar" | "frame" | "card_back";
    rarity: string;
  };
};

type ProfileResponse = {
  id: number;
  name: string;
  role: string;
  profile: {
    displayName: string | null;
    bio: string | null;
    avatarItemId: number | null;
    frameItemId: number | null;
    cardBackItemId: number | null;
  } | null;
  inventory: OwnedItem[];
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [equipped, setEquipped] = useState({ avatarItemId: 0, frameItemId: 0, cardBackItemId: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [meRes, profileRes] = await Promise.all([
        fetch("/api/user/me", { cache: "no-store" }),
        fetch("/api/user/dashboard", { cache: "no-store" }),
      ]);

      if (meRes.ok) {
        const me = (await meRes.json()) as ProfileResponse;
        setDisplayName(me.profile?.displayName || me.name || "");
        setBio(me.profile?.bio || "");
        setOwnedItems(me.inventory || []);
        setEquipped({
          avatarItemId: me.profile?.avatarItemId || 0,
          frameItemId: me.profile?.frameItemId || 0,
          cardBackItemId: me.profile?.cardBackItemId || 0,
        });
      }

      if (profileRes.ok) {
        // no-op: call keeps dashboard cache warm for fast nav
      }

      setLoading(false);
    };

    void load();
  }, []);

  const grouped = useMemo(() => {
    return {
      avatar: ownedItems.filter((item) => item.shopItem.type === "avatar"),
      frame: ownedItems.filter((item) => item.shopItem.type === "frame"),
      card_back: ownedItems.filter((item) => item.shopItem.type === "card_back"),
    };
  }, [ownedItems]);

  const saveProfile = async () => {
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, bio }),
    });
    setSaving(false);
    if (!res.ok) {
      alert("Profil guncellenemedi.");
      return;
    }
    alert("Profil kaydedildi.");
  };

  const equip = async (shopItemId: number, type: "avatar" | "frame" | "card_back") => {
    const res = await fetch("/api/store/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopItemId }),
    });
    if (!res.ok) {
      alert("Kusanma islemi basarisiz.");
      return;
    }

    if (type === "avatar") setEquipped((prev) => ({ ...prev, avatarItemId: shopItemId }));
    if (type === "frame") setEquipped((prev) => ({ ...prev, frameItemId: shopItemId }));
    if (type === "card_back") setEquipped((prev) => ({ ...prev, cardBackItemId: shopItemId }));
  };

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#fff7ed,_#fafafa_35%,_#ecfeff)] dark:bg-[radial-gradient(circle_at_top_right,_#1f2937,_#020617_35%,_#052e16)]">
      <UserNav username={session.user.name || "Oyuncu"} />
      <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-5 space-y-3">
          <h1 className="text-2xl font-black">Profil</h1>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Gorunen ad" maxLength={60} />
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kisa bio" maxLength={300} rows={3} />
          <Button onClick={saveProfile} disabled={saving}>{saving ? "Kaydediliyor..." : "Profili Kaydet"}</Button>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <CosmeticColumn
            title="Avatar"
            items={grouped.avatar}
            activeId={equipped.avatarItemId}
            loading={loading}
            onEquip={(id) => equip(id, "avatar")}
          />
          <CosmeticColumn
            title="Cerceve"
            items={grouped.frame}
            activeId={equipped.frameItemId}
            loading={loading}
            onEquip={(id) => equip(id, "frame")}
          />
          <CosmeticColumn
            title="Kart Arkasi"
            items={grouped.card_back}
            activeId={equipped.cardBackItemId}
            loading={loading}
            onEquip={(id) => equip(id, "card_back")}
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
  items: OwnedItem[];
  activeId: number;
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
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{item.shopItem.name}</p>
                <p className="text-xs text-zinc-500">{item.shopItem.rarity}</p>
              </div>
              <Button
                size="sm"
                variant={activeId === item.shopItem.id ? "default" : "outline"}
                onClick={() => onEquip(item.shopItem.id)}
              >
                {activeId === item.shopItem.id ? "Kusaniyor" : "Kusan"}
              </Button>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
