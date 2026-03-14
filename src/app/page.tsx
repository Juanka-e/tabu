"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
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
import { useSession } from "next-auth/react";
import { AnnouncementsModal } from "@/components/game/announcements-modal";
import { getCaptchaTokenForAction } from "@/lib/security/captcha-client";

interface SocketIdentityPayload {
  playerId: string;
  guestToken: string | null;
}

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  const handleJoinOrCreate = async (isCreate: boolean) => {
    const currentUsername = username.trim();

    if (!currentUsername) {
      setError("Lutfen bir kullanici adi girin.");
      return;
    }
    if (!isCreate && !roomCode.trim()) {
      setError("Lutfen bir oda kodu girin.");
      return;
    }

    setIsConnecting(true);
    setError("");

    const guestToken = window.sessionStorage.getItem("tabu_guestToken") || undefined;
    const captchaAction = isCreate ? "room_create" : "guest_join";

    try {
      const { token } = await getCaptchaTokenForAction(captchaAction);

      const socket = io({
        path: "/api/socketio",
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        socket.emit("room:request", {
          kullaniciAdi: currentUsername,
          odaKodu: isCreate ? undefined : roomCode.trim().toUpperCase(),
          ...(guestToken ? { guestToken } : {}),
          ...(token ? { captchaToken: token } : {}),
        });
      });

      socket.on("kimlikAta", ({ playerId, guestToken: assignedGuestToken }: SocketIdentityPayload) => {
        window.sessionStorage.setItem("tabu_playerId", playerId);
        if (assignedGuestToken) {
          window.sessionStorage.setItem("tabu_guestToken", assignedGuestToken);
        } else {
          window.sessionStorage.removeItem("tabu_guestToken");
        }
      });

      socket.on("lobiGuncelle", (data: { odaKodu: string }) => {
        localStorage.setItem("tabu_username", currentUsername);
        localStorage.setItem("tabu_roomCode", data.odaKodu);
        socket.disconnect();
        router.push(`/room/${data.odaKodu}`);
      });

      socket.on("hata", (message: string) => {
        setError(message);
        setIsConnecting(false);
        socket.disconnect();
      });

      socket.on("connect_error", () => {
        setError("Sunucuya baglanilamadi. Lutfen tekrar deneyin.");
        setIsConnecting(false);
      });
    } catch {
      setError("Guvenlik dogrulamasi baslatilamadi. Lutfen tekrar deneyin.");
      setIsConnecting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
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

      <Card className="relative z-10 w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-4 pb-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg">
            <Gamepad2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-3xl font-bold text-transparent">TABU</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Online Sözcük Tahmin Oyunu</p>
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
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && username.trim()) {
                  handleJoinOrCreate(true);
                }
              }}
              maxLength={50}
              className="h-12 bg-background/50 text-base"
            />
          </div>

          <Button
            onClick={() => handleJoinOrCreate(true)}
            disabled={isConnecting || !username.trim()}
            className="h-12 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-base font-semibold shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-blue-700 hover:shadow-xl"
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
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">veya</span>
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
                onChange={(event) => {
                  setRoomCode(event.target.value.toUpperCase());
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && username.trim() && roomCode.trim()) {
                    handleJoinOrCreate(false);
                  }
                }}
                maxLength={6}
                className="h-12 bg-background/50 text-center text-base font-mono tracking-widest"
              />
              <Button
                onClick={() => handleJoinOrCreate(false)}
                disabled={isConnecting || !username.trim() || !roomCode.trim()}
                variant="secondary"
                className="h-12 px-6 font-semibold"
              >
                <LogIn className="mr-1 h-5 w-5" />
                Katıl
              </Button>
            </div>
          </div>

          {error ? (
            <div className="animate-in fade-in slide-in-from-top-1 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="relative z-10 mt-6 text-xs text-muted-foreground">Tabu Online - Arkadaşlarınla eğlenceli vakit geçir!</p>

      <AnnouncementsModal isOpen={showAnnouncements} onClose={() => setShowAnnouncements(false)} />
    </div>
  );
}


