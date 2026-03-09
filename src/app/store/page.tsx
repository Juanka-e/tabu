"use client";

import { useSession } from "next-auth/react";
import { UserNav } from "@/components/user/user-nav";
import { ShopContent } from "@/components/game/dashboard-pages/shop-content";

export default function StorePage() {
    const { data: session } = useSession();

    if (!session?.user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfccb,_#f8fafc_40%,_#dbeafe)] dark:bg-[radial-gradient(circle_at_top,_#14532d,_#020617_40%,_#1e293b)]">
            <UserNav username={session.user.name || "Oyuncu"} />
            <main className="mx-auto max-w-7xl p-4 md:p-8">
                <ShopContent layout="page" />
            </main>
        </div>
    );
}
