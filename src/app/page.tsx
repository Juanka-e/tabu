"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession, signOut, signIn } from "next-auth/react";
import { AnnouncementsModal } from "@/components/game/announcements-modal";

export default function HomePage() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUsername = session?.user?.name || "";
  const isGuest = session?.user?.role === "guest";
  const isRegisteredUser = !!session?.user && !isGuest;
  const hasAnySession = !!session?.user;

  // Set initial username from session if available
  const [username, setUsername] = useState(sessionUsername || "");

  // Sync username if session loads late
  useEffect(() => {
    if (sessionUsername && !username) {
      setUsername(sessionUsername);
    }
  }, [sessionUsername]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleJoinOrCreate = useCallback(
    async (isCreate: boolean) => {
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

      try {
        // Automatically sign in as guest if absolutely no session exists
        if (!hasAnySession) {
          const res = await signIn("guest-login", {
            guestName: username.trim(),
            redirect: false,
          });

          if (res?.error) {
            setError("Sunucuya bağlanılamadı (Oturum açılamadı). Lütfen tekrar deneyin.");
            setIsConnecting(false);
            return;
          }
        }
      } catch (err) {
        console.error("Auto-login failed:", err);
        setError("Oturum açılırken bir hata oluştu.");
        setIsConnecting(false);
        return;
      }

      const socket: Socket = io({
        path: "/api/socketio",
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        socket.emit("odaİsteği", {
          kullaniciAdi: username.trim(),
          odaKodu: isCreate ? undefined : roomCode.trim().toUpperCase()
        });
      });

      socket.on("lobiGuncelle", (data: { odaKodu: string }) => {
        // Store socket info and redirect to room
        localStorage.setItem("tabu_username", username.trim());
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
    },
    [username, roomCode, router, hasAnySession]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        {!isRegisteredUser && (
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
              Giriş Yap
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/register")}>
              Kayıt Ol
            </Button>
          </>
        )}
        {isRegisteredUser && (
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            {sessionUsername} (Çıkış)
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAnnouncements(true)}
          className="rounded-full"
        >
          <Megaphone className="h-5 w-5" />
        </Button>
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Main card */}
      <Card className="w-full max-w-md relative z-10 border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Gamepad2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              TABU
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Online Sözcük Tahmin Oyunu
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Username */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              Kullanıcı Adı
            </div>
            <Input
              placeholder="Adınızı girin..."
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && username.trim()) {
                  handleJoinOrCreate(true);
                }
              }}
              maxLength={50}
              className="h-12 text-base bg-background/50"
            />
          </div>

          {/* Create Room */}
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

          {/* Divider */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              veya
            </span>
            <Separator className="flex-1" />
          </div>

          {/* Join Room */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Oda Kodu
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Örn: ABC123"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && username.trim() && roomCode.trim()) {
                    handleJoinOrCreate(false);
                  }
                }}
                maxLength={6}
                className="h-12 text-base font-mono tracking-widest text-center bg-background/50"
              />
              <Button
                onClick={() => handleJoinOrCreate(false)}
                disabled={
                  isConnecting || !username.trim() || !roomCode.trim()
                }
                variant="secondary"
                className="h-12 px-6 font-semibold"
              >
                <LogIn className="h-5 w-5 mr-1" />
                Katıl
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-6 text-xs text-muted-foreground relative z-10">
        Tabu Online — Arkadaşlarınla eğlenceli vakit geçir!
      </p>

      {/* Announcements Modal */}
      <AnnouncementsModal
        isOpen={showAnnouncements}
        onClose={() => setShowAnnouncements(false)}
      />
    </div>
  );
}
