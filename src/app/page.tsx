"use client";

import { useState } from "react";
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
  LogOut,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { AnnouncementsModal } from "@/components/game/announcements-modal";
import { DashboardLayout } from "@/components/game/dashboard-overlay";

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const sessionUsername = session?.user?.name || "";

  const handleJoinOrCreate = (isCreate: boolean) => {
    const currentUsername = (isLoggedIn ? sessionUsername : username).trim();

    if (!currentUsername) {
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
        kullaniciAdi: currentUsername,
        odaKodu: isCreate ? undefined : roomCode.trim().toUpperCase(),
        playerId: storedPlayerId,
        ...(Number.isInteger(authUserId) ? { authUserId } : {}),
      });
    });

    socket.on("kimlikAta", (newPlayerId: string) => {
      localStorage.setItem("tabu_playerId", newPlayerId);
    });

    socket.on("lobiGuncelle", (data: { odaKodu: string }) => {
      localStorage.setItem("tabu_username", currentUsername);
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

  // ─── Play tab content (room create/join card) ──────────────
  const playContent = (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Gamepad2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Oyna</h2>
            <p className="text-sm text-muted-foreground mt-1">Yeni oda oluştur veya mevcut odaya katıl</p>
          </div>
        </div>

        {/* Create room */}
        <Button
          onClick={() => handleJoinOrCreate(true)}
          disabled={isConnecting}
          className="w-full h-14 text-base font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all duration-200 rounded-xl"
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

        {/* Join room */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Oda Kodunu Gir
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="ABC123"
              value={roomCode}
              onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter" && roomCode.trim()) handleJoinOrCreate(false); }}
              maxLength={6}
              className="h-12 text-base font-mono tracking-widest text-center bg-white/50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/50 rounded-xl"
            />
            <Button
              onClick={() => handleJoinOrCreate(false)}
              disabled={isConnecting || !roomCode.trim()}
              variant="secondary"
              className="h-12 px-6 font-bold rounded-xl"
            >
              <LogIn className="h-5 w-5 mr-1" />
              Katıl
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Logged-in: Full-page glassmorphism dashboard ──────────
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      {/* Compact header — logo + utils only */}
      <header className="shrink-0 z-40 border-b border-white/30 dark:border-slate-700/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 md:px-6 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Gamepad2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">TABU</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => setShowAnnouncements(true)} className="rounded-full h-8 w-8">
              <Megaphone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="rounded-full h-8 w-8"
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </span>
            </Button>
            {session?.user?.role === "admin" && (
              <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="rounded-full h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Separator orientation="vertical" className="h-5 mx-1" />
            <span className="text-xs font-medium text-foreground hidden sm:inline">{sessionUsername}</span>
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-full h-8 w-8 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Full-page glass dashboard with Play tab */}
      <div className="flex-1 overflow-hidden p-3 md:p-5">
        <div className="glass-panel w-full h-full rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
          <DashboardLayout
            defaultTab="play"
            showPlayTab
            playContent={playContent}
          />
        </div>
      </div>

      <AnnouncementsModal isOpen={showAnnouncements} onClose={() => setShowAnnouncements(false)} />
    </div>
  );
}
