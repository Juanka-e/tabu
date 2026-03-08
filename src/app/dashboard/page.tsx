import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/economy";
import { UserNav } from "@/components/user/user-nav";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userId = Number(session.user.id);
  const data = await getDashboardData(userId);

  const winCount = data.recentMatches.filter((match) => match.won).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f5f3ff,_#f8fafc_40%,_#ecfeff)] dark:bg-[radial-gradient(circle_at_top_left,_#111827,_#020617_40%,_#052e16)]">
      <UserNav username={session.user.name || "Oyuncu"} />
      <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Coin" value={String(data.coinBalance)} />
          <StatCard label="Toplam Mac" value={String(data.totalMatches)} />
          <StatCard label="Winrate" value={`%${data.winRate}`} />
          <StatCard label="Son 5 Mac Win" value={String(winCount)} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Link href="/" className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-5 hover:shadow-md transition">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Hizli Islem</p>
            <h2 className="text-xl font-semibold mt-1">Yeni Oda Olustur</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">Anasayfadan tek tikla oyun baslat.</p>
          </Link>

          <Link href="/" className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-5 hover:shadow-md transition">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Hizli Islem</p>
            <h2 className="text-xl font-semibold mt-1">Odaya Katil</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">Kodla dogrudan lobiye gec.</p>
          </Link>

          <Link href="/store" className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-5 hover:shadow-md transition">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Kozmetik</p>
            <h2 className="text-xl font-semibold mt-1">Magazaya Git</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">Coinlerini avatar ve cerceveye cevir.</p>
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-5">
          <h3 className="text-lg font-semibold">Son 5 Mac</h3>
          <div className="mt-3 space-y-2">
            {data.recentMatches.length === 0 ? (
              <p className="text-sm text-zinc-500">Henuz mac kaydi yok.</p>
            ) : (
              data.recentMatches.map((match) => (
                <div key={match.id} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm">
                  <span>{match.roomCode}</span>
                  <span className={match.won ? "text-emerald-600" : "text-zinc-500"}>{match.won ? "Kazandi" : "Kaybetti"}</span>
                  <span>{match.scoreA} - {match.scoreB}</span>
                  <span>{match.coinEarned} coin</span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/70 p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">{value}</p>
    </article>
  );
}
