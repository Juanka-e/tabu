"use client";

import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Gamepad2,
  Users,
  Plus,
  LogIn,
  Sparkles,
  Moon,
  Sun,
  Megaphone,
  LayoutDashboard,
  Trophy,
  Coins,
  Swords,
  TrendingUp,
  ShoppingBag,
  Settings,
  LogOut,
  Package,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { AnnouncementsModal } from "@/components/game/announcements-modal";
import { DashboardOverlay } from "@/components/game/dashboard-overlay";

interface DashboardData {
  coinBalance: number;
  totalMatches: number;
  winRate: number;
  totalCoinEarned: number;
  recentMatches: {
    id: number;
    roomCode: string;
    won: boolean;
    scoreA: number;
    scoreB: number;
    coinEarned: number;
    createdAt: string;
  }[];
}

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const sessionUsername = session?.user?.name || "";

  useEffect(() => {
    if (!isLoggedIn) return;
    setUsername(sessionUsername);
    const load = async () => {
      try {
        const res = await fetch("/api/user/dashboard", { cache: "no-store" });
        if (res.ok) setDashData(await res.json());
      } catch {
        // silently fail
      }
    };
    void load();
  }, [isLoggedIn, sessionUsername]);

  const handleJoinOrCreate = (isCreate: boolean) => {
    if (!username.trim()) {
      setError("Lütfen bir kullanıcı adı girin.");
      return;
    }

    if (!isCreate && !roomCode.trim()) {
      setError("Lütfen bir oda kodu girin.");
      return;
    }

    setIsConnecting(true);
    setError("");

    const storedPlayerId = localStorage.getItem("tabu_playerId") || undefined;
    const authUserId = session?.user?.id ? Number(session.user.id) : undefined;

    const socket: Socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("odaİsteği", {
        kullaniciAdi: username.trim(),
        odaKodu: isCreate ? undefined : roomCode.trim().toUpperCase(),
        playerId: storedPlayerId,
        ...(Number.isInteger(authUserId) ? { authUserId } : {}),
      });
    });

    socket.on("kimlikAta", (newPlayerId: string) => {
      localStorage.setItem("tabu_playerId", newPlayerId);
    });

    socket.on("lobiGuncelle", (data: { odaKodu: string }) => {
      localStorage.setItem("tabu_username", username.trim());
      localStorage.setItem("tabu_roomCode", data.odaKodu);
      socket.disconnect();
      router.push(`/room/${data.odaKodu}`);
    });

    socket.on("hata", (msg: string) => {
      setError(msg);
      setIsConnecting(false);
      socket.disconnect();
    });

    socket.on("connect_error", () => {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
      setIsConnecting(false);
    });
  };

  // ─── Guest view (original simple card) ─────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
          <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>Giriş Yap</Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/register")}>Kayıt Ol</Button>
          <Button variant="ghost" size="icon" onClick={() => setShowAnnouncements(true)} className="rounded-full">
            <Megaphone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </span>
          </Button>
        </div>

        <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Gamepad2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">TABU</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Online Sözcük Tahmin Oyunu</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                Kullanıcı Adı
              </div>
              <Input
                placeholder="Adınızı girin..."
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && username.trim()) handleJoinOrCreate(true); }}
                maxLength={50}
                className="h-12 text-base bg-background/50"
              />
            </div>

            <Button
              onClick={() => handleJoinOrCreate(true)}
              disabled={isConnecting || !username.trim()}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Bağlanılıyor...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Yeni Oda Oluştur
                </div>
              )}
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">veya</span>
              <Separator className="flex-1" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Oda Kodu
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Örn: ABC123"
                  value={roomCode}
                  onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && username.trim() && roomCode.trim()) handleJoinOrCreate(false); }}
                  maxLength={6}
                  className="h-12 text-base font-mono tracking-widest text-center bg-background/50"
                />
                <Button
                  onClick={() => handleJoinOrCreate(false)}
                  disabled={isConnecting || !username.trim() || !roomCode.trim()}
                  variant="secondary"
                  className="h-12 px-6 font-semibold"
                >
                  <LogIn className="h-5 w-5 mr-1" />
                  Katıl
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-muted-foreground relative z-10">Tabu Online - Arkadaşlarınla eğlenceli vakit geçir!</p>

        <AnnouncementsModal isOpen={showAnnouncements} onClose={() => setShowAnnouncements(false)} />
      </div>
    );
  }

  // ─── Logged-in user: Full-page dashboard ───────────────────
  const stats = [
    { icon: Swords, label: "Toplam Maç", value: dashData?.totalMatches ?? 0, color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Trophy, label: "Win Rate", value: `${dashData?.winRate ?? 0}%`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Coins, label: "Coin Bakiye", value: dashData?.coinBalance?.toLocaleString() ?? "0", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: TrendingUp, label: "Toplam Kazanç", value: dashData?.totalCoinEarned?.toLocaleString() ?? "0", color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">TABU</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowAnnouncements(true)} className="rounded-full">
              <Megaphone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="rounded-full"
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </span>
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <span className="text-sm font-medium text-foreground">{sessionUsername}</span>
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-full text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8 relative z-10 space-y-8">
        {/* Welcome + Quick Actions */}
        <section className="flex flex-col lg:flex-row gap-6">
          {/* Welcome */}
          <div className="flex-1">
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              Hoş Geldin, <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">{sessionUsername}</span>!
            </h1>
            <p className="text-muted-foreground mt-1">Oyna, kazan ve koleksiyonunu büyüt.</p>
          </div>

          {/* Play actions */}
          <div className="flex gap-3 shrink-0">
            <Button
              onClick={() => handleJoinOrCreate(true)}
              disabled={isConnecting}
              size="lg"
              className="h-12 px-6 text-base font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              Yeni Oda
            </Button>
            <div className="flex gap-1">
              <Input
                placeholder="Oda Kodu"
                value={roomCode}
                onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && roomCode.trim()) handleJoinOrCreate(false); }}
                maxLength={6}
                className="h-12 w-32 text-base font-mono tracking-widest text-center bg-background/60"
              />
              <Button
                onClick={() => handleJoinOrCreate(false)}
                disabled={isConnecting || !roomCode.trim()}
                variant="secondary"
                size="lg"
                className="h-12 px-4 font-semibold"
              >
                <LogIn className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <Card key={label} className="border-border/50 bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-colors">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`p-3 rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Quick Access Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowDashboard(true)}
            className="group text-left p-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm hover:bg-card/80 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <LayoutDashboard className="h-5 w-5 text-blue-500" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Dashboard</h3>
            <p className="text-xs text-muted-foreground">İstatistiklerini, envanterini ve ayarlarını yönet.</p>
          </button>

          <button
            onClick={() => setShowDashboard(true)}
            className="group text-left p-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm hover:bg-card/80 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <ShoppingBag className="h-5 w-5 text-amber-500" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Mağaza</h3>
            <p className="text-xs text-muted-foreground">Avatar, çerçeve ve özel ürünler satın al.</p>
          </button>

          <button
            onClick={() => setShowDashboard(true)}
            className="group text-left p-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm hover:bg-card/80 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Package className="h-5 w-5 text-purple-500" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Envanter</h3>
            <p className="text-xs text-muted-foreground">Koleksiyonundaki öğeleri incele ve kuşan.</p>
          </button>
        </section>

        {/* Recent Matches */}
        {dashData && dashData.recentMatches.length > 0 && (
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Swords className="h-5 w-5 text-muted-foreground" />
                Son Maçlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashData.recentMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${match.won ? "bg-emerald-500" : "bg-red-400"}`}
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {match.won ? "Galibiyet" : "Mağlubiyet"}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {match.scoreA} - {match.scoreB}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-muted-foreground">
                        {match.roomCode}
                      </span>
                      <span className="text-sm font-bold text-amber-500 flex items-center gap-1">
                        +{match.coinEarned} <Coins className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin link */}
        {session?.user?.role === "admin" && (
          <button
            onClick={() => router.push("/admin")}
            className="w-full p-4 rounded-xl border border-border/50 bg-card/40 hover:bg-card/60 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Admin Paneli
          </button>
        )}
      </main>

      {/* Modals */}
      <AnnouncementsModal isOpen={showAnnouncements} onClose={() => setShowAnnouncements(false)} />
      <DashboardOverlay isOpen={showDashboard} onClose={() => setShowDashboard(false)} />
    </div>
  );
}
