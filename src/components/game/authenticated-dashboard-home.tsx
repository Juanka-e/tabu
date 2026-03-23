"use client";

import { useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Gamepad2,
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
import type { DashboardTab } from "@/components/game/dashboard-nav";
import { useBranding } from "@/components/providers/branding-provider";
import { getCaptchaTokenForAction } from "@/lib/security/captcha-client";

interface SocketIdentityPayload {
  playerId: string;
  guestToken: string | null;
}

interface AuthenticatedDashboardHomeProps {
  defaultTab?: DashboardTab;
}

export function AuthenticatedDashboardHome({
  defaultTab = "dash",
}: AuthenticatedDashboardHomeProps) {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  const branding = useBranding();

  if (!session?.user) {
    return null;
  }

  const sessionUsername = session.user.name || "";

  const handleJoinOrCreate = async (isCreate: boolean) => {
    const currentUsername = sessionUsername.trim();

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

    try {
      const { token } = isCreate
        ? await getCaptchaTokenForAction("room_create")
        : { token: null as string | null };

      const socket: Socket = io({
        path: "/api/socketio",
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        socket.emit("room:request", {
          kullaniciAdi: currentUsername,
          odaKodu: isCreate ? undefined : roomCode.trim().toUpperCase(),
          ...(token ? { captchaToken: token } : {}),
        });
      });

      socket.on("kimlikAta", ({ playerId, guestToken }: SocketIdentityPayload) => {
        window.sessionStorage.setItem("tabu_playerId", playerId);
        if (guestToken) {
          window.sessionStorage.setItem("tabu_guestToken", guestToken);
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
        setError("Sunucuya baglanilamadi. Lutfen tekrar dene.");
        setIsConnecting(false);
      });
    } catch {
      setError("Guvenlik dogrulamasi baslatilamadi. Lutfen tekrar deneyin.");
      setIsConnecting(false);
    }
  };

  const playContent = (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/20">
            <Gamepad2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Oyna</h2>
            <p className="mt-1 text-sm text-muted-foreground">Yeni oda olustur veya mevcut odaya katil</p>
          </div>
        </div>

        <Button
          onClick={() => handleJoinOrCreate(true)}
          disabled={isConnecting}
          className="h-14 w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-base font-bold shadow-lg shadow-purple-500/20 transition-all duration-200 hover:from-purple-700 hover:to-blue-700 hover:shadow-xl"
        >
          {isConnecting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Baglaniyor...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Yeni Oda Olustur
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
            Oda Kodunu Gir
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="ABC123"
              value={roomCode}
              onChange={(event) => {
                setRoomCode(event.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && roomCode.trim()) {
                  handleJoinOrCreate(false);
                }
              }}
              maxLength={6}
              className="h-12 rounded-xl border-slate-200/60 bg-white/50 text-center text-base tracking-widest dark:border-slate-700/50 dark:bg-slate-800/50"
            />
            <Button
              onClick={() => handleJoinOrCreate(false)}
              disabled={isConnecting || !roomCode.trim()}
              variant="secondary"
              className="h-12 rounded-xl px-6 font-bold"
            >
              <LogIn className="mr-1 h-5 w-5" />
              Katil
            </Button>
          </div>
        </div>

        {error ? (
          <div className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="z-40 shrink-0 border-b border-white/30 bg-white/60 backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-900/60">
        <div className="flex items-center justify-between px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-white/85 shadow-md dark:border-slate-700/60 dark:bg-slate-900/80">
              {branding.logoUrl ? (
                <Image
                  src={branding.logoUrl}
                  alt={`${branding.siteName} logo`}
                  width={32}
                  height={32}
                  unoptimized
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Gamepad2 className="h-4 w-4 text-slate-900 dark:text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-lg font-bold text-transparent">
                {branding.siteShortName.toUpperCase()}
              </div>
              <div className="truncate text-[11px] font-medium text-muted-foreground">
                {branding.siteName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => setShowAnnouncements(true)} className="h-8 w-8 rounded-full">
              <Megaphone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="h-8 w-8 rounded-full"
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </span>
            </Button>
            {session.user.role === "admin" ? (
              <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="h-8 w-8 rounded-full">
                <Settings className="h-4 w-4" />
              </Button>
            ) : null}
            <Separator orientation="vertical" className="mx-1 h-5" />
            <span className="hidden text-xs font-medium text-foreground sm:inline">{sessionUsername}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                void signOut({ redirect: false }).then(() => {
                  router.push("/");
                  router.refresh();
                });
              }}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-3 md:p-5">
        <div className="glass-panel h-full w-full overflow-hidden rounded-2xl shadow-2xl md:rounded-3xl">
          <DashboardLayout defaultTab={defaultTab} showPlayTab playContent={playContent} />
        </div>
      </div>

      <AnnouncementsModal isOpen={showAnnouncements} onClose={() => setShowAnnouncements(false)} />
    </div>
  );
}


