"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/game/sidebar";
import { RulesModal } from "@/components/game/rules-modal";
import { Lobby } from "@/components/game/lobby";
import { AnnouncementsModal } from "@/components/game/announcements-modal";
import { DashboardOverlay } from "@/components/game/dashboard-overlay";
import { Moon, Sun, Megaphone, Book, Menu, LayoutDashboard, Lock, Pencil, Save, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import type { ResolvedCardFaceTheme } from "@/lib/cosmetics/card-face";
import type { ResolvedCardBackTheme } from "@/lib/cosmetics/card-back";
import { ROOM_ROLE_GUESSER } from "@/lib/game/room-display";
import { getCaptchaTokenForAction } from "@/lib/security/captcha-client";
import { GameView } from "@/types/game";
import type {
    Player,
    GameState,
    CardData,
    RoomData,
    TransitionData,
    TurnInfo,
    GameOverData,
    CategoryItem,
} from "@/types/game";

// Sub-components
import { TransitionScreen } from "./_components/transition-screen";
import { ActiveGame } from "./_components/active-game";
import { GameOverScreen } from "./_components/game-over-screen";
import { UsernamePrompt } from "./_components/username-prompt";

interface SocketIdentityPayload {
    playerId: string;
    guestToken: string | null;
}

const ROOM_SWITCH_TEAM_EVENT = "takim_degistir";
const ROOM_START_GAME_EVENT = "oyun_baslat";
const ROOM_GAME_CONTROL_EVENT = "oyun_kontrol";
const ROOM_RESET_GAME_EVENT = "oyun_sifirla";

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [, startTransition] = useTransition();
    const roomCode = params.code as string;
    const { data: session } = useSession();

    // Socket
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [socketId, setSocketId] = useState("");
    const [myPlayerId, setMyPlayerId] = useState("");
    const rewardClaimedMatchesRef = useRef<Set<string>>(new Set());
    const currentMatchSequenceRef = useRef(0);

    // Room state
    const [view, setView] = useState<GameView>(GameView.LOBBY);
    const [players, setPlayers] = useState<Player[]>([]);
    const [creatorId, setCreatorId] = useState("");
    const [creatorPlayerId, setCreatorPlayerId] = useState("");

    // Settings
    const [settings, setSettings] = useState({
        sure: 60,
        mod: "tur" as "tur" | "skor",
        deger: 2,
    });
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);

    // Game state
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [card, setCard] = useState<CardData | null>(null);
    const [myRole, setMyRole] = useState(ROOM_ROLE_GUESSER);
    const [isPrimaryInspector, setIsPrimaryInspector] = useState(false);
    const [narratorName, setNarratorName] = useState("");
    const [inspectorName, setInspectorName] = useState("");
    const [cardFaceTheme, setCardFaceTheme] = useState<ResolvedCardFaceTheme | null>(null);
    const [cardBackTheme, setCardBackTheme] = useState<ResolvedCardBackTheme | null>(null);

    // Transition
    const [transition, setTransition] = useState<TransitionData | null>(null);

    // Game over
    const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);

    // Sidebar
    const [sidebarAOpen, setSidebarAOpen] = useState(true);
    const [sidebarBOpen, setSidebarBOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Modals
    const [showRules, setShowRules] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [hasConfirmedUsername, setHasConfirmedUsername] = useState(false);
    const [entryError, setEntryError] = useState("");
    const [showIdentityEditor, setShowIdentityEditor] = useState(false);
    const [identityDraftName, setIdentityDraftName] = useState("");
    const [identitySaving, setIdentitySaving] = useState(false);
    const [identityError, setIdentityError] = useState("");
    const [storedUsername, setStoredUsername] = useState<string | null>(null);
    const isRoomClientReady = storedUsername !== null;
    const isAuthenticatedRoomUser = Boolean(session?.user?.id);
    const showUsernamePrompt =
        isRoomClientReady &&
        !isAuthenticatedRoomUser &&
        !hasConfirmedUsername &&
        (storedUsername || "").trim().length === 0;
    const currentPlayer = players.find((player) => player.playerId === myPlayerId) ?? null;
    const currentVisibleName =
        currentPlayer?.ad ||
        (storedUsername || "").trim() ||
        session?.user?.name ||
        "Oyuncu";
    const currentAvatarUrl = currentPlayer?.cosmetics?.avatarImageUrl ?? null;
    const canEditIdentity = view === GameView.LOBBY;

    useEffect(() => {
        const syncStoredUsername = () => {
            setStoredUsername(window.localStorage.getItem("tabu_username") || "");
        };

        syncStoredUsername();
        window.addEventListener("storage", syncStoredUsername);
        return () => window.removeEventListener("storage", syncStoredUsername);
    }, []);

    useEffect(() => {
        setIdentityDraftName(currentVisibleName);
    }, [currentVisibleName]);

    useEffect(() => {
        if (currentVisibleName.trim().length > 0) {
            window.localStorage.setItem("tabu_username", currentVisibleName);
        }
    }, [currentVisibleName]);

    useEffect(() => {
        if (view !== GameView.LOBBY) {
            setShowIdentityEditor(false);
            setIdentityError("");
        }
    }, [view]);

    // Responsive check
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            startTransition(() => {
                setIsMobile(mobile);
                if (mobile) {
                    setSidebarAOpen(false);
                    setSidebarBOpen(false);
                } else {
                    setSidebarAOpen(true);
                    setSidebarBOpen(true);
                }
            });
        };
        handleResize();
        window.addEventListener("resize", handleResize, { passive: true });
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Connect socket (only when username is set)
    useEffect(() => {
        if (!isRoomClientReady || showUsernamePrompt) return;

        let isMounted = true;
        let activeSocket: Socket | null = null;
        const username = storedUsername || session?.user?.name || "Oyuncu";

        async function connectToRoom(): Promise<void> {
            try {
                setEntryError("");
                const guestToken = session?.user?.id
                    ? undefined
                    : window.sessionStorage.getItem("tabu_guestToken") || undefined;
                const captchaToken = session?.user?.id
                    ? null
                    : (await getCaptchaTokenForAction("guest_join")).token;

                if (!isMounted) {
                    return;
                }

                const socket = io({
                    path: "/api/socketio",
                    transports: ["websocket", "polling"],
                });

                activeSocket = socket;
                socketRef.current = socket;

                socket.on("connect", () => {
                    setIsConnected(true);
                    if (socket.id) setSocketId(socket.id);
                    socket.emit("room:request", {
                        kullaniciAdi: username,
                        odaKodu: roomCode,
                        ...(guestToken ? { guestToken } : {}),
                        ...(captchaToken ? { captchaToken } : {}),
                    });
                });

                socket.on("disconnect", () => setIsConnected(false));

                socket.on("kimlikAta", ({ playerId, guestToken: assignedGuestToken }: SocketIdentityPayload) => {
                    window.sessionStorage.setItem("tabu_playerId", playerId);
                    if (assignedGuestToken) {
                        window.sessionStorage.setItem("tabu_guestToken", assignedGuestToken);
                    } else {
                        window.sessionStorage.removeItem("tabu_guestToken");
                    }
                    setMyPlayerId(playerId);
                });

                socket.on("lobiGuncelle", (data: RoomData & { creatorPlayerId?: string }) => {
                    setPlayers(data.oyuncular);
                    setCreatorId(data.creatorId);
                    setCreatorPlayerId(data.creatorPlayerId || "");
                    setSettings(data.ayarlar);
                    if (data.seciliKategoriler) setSelectedCategories(data.seciliKategoriler);
                    if (data.seciliZorluklar) setSelectedDifficulties(data.seciliZorluklar);
                });

                socket.on("kategoriListesiGonder", (cats: CategoryItem[]) => {
                    setCategories(cats);
                });

                socket.on("kategoriAyarlariGuncellendi", (data: {
                    seciliKategoriler: number[];
                    seciliZorluklar: number[];
                }) => {
                    setSelectedCategories(data.seciliKategoriler);
                    setSelectedDifficulties(data.seciliZorluklar);
                });

                socket.on("oyunBasladi", () => {
                    currentMatchSequenceRef.current += 1;
                    setView(GameView.TRANSITION);
                    setIsPrimaryInspector(false);
                    setCardFaceTheme(null);
                });

                socket.on("turGecisiBaslat", (data: TransitionData) => {
                    setView(GameView.TRANSITION);
                    setIsPrimaryInspector(false);
                    setTransition(data);
                    setCardBackTheme(data.cardBackTheme);
                });

                socket.on("turGecisDurumGuncelle", (data: { oyunDurduruldu: boolean; kalanSure: number }) => {
                    setTransition((prev) =>
                        prev ? { ...prev, kalanSure: data.kalanSure } : null
                    );
                });

                socket.on("yeniTurBilgisi", (data: TurnInfo) => {
                    setMyRole(data.rol);
                    setIsPrimaryInspector(data.isPrimaryGozetmen);
                    setCard(data.kart);
                    setNarratorName(data.anlaticiAd);
                    setInspectorName(data.gozetmenAd);
                    setCardFaceTheme(data.cardFaceTheme);
                    setCardBackTheme(data.cardBackTheme);
                    setView(GameView.PLAYING);
                });

                socket.on("oyunDurumuGuncelle", (data: GameState) => {
                    setGameState(data);
                    if (data.creatorId) setCreatorId(data.creatorId);
                });

                socket.on("kartGuncelle", (newCard: CardData | null) => {
                    setCard(newCard);
                });

                socket.on("oyunBitti", (data: GameOverData) => {
                    setView(GameView.GAME_OVER);
                    setGameOverData(data);

                    if (!session?.user?.id) return;
                    const claimKey = `${roomCode}:${currentMatchSequenceRef.current}`;
                    if (rewardClaimedMatchesRef.current.has(claimKey)) return;

                    rewardClaimedMatchesRef.current.add(claimKey);
                    const tryFinalizeReward = async (attempt = 0) => {
                        try {
                            const response = await fetch("/api/game/match/finalize", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    roomCode,
                                }),
                            });

                            if (response.ok) {
                                return;
                            }

                            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                            const shouldRetry =
                                attempt < 2 &&
                                (response.status === 404 ||
                                    (response.status === 409 &&
                                        payload?.error === "Mac henuz tamamlanmadi."));

                            if (shouldRetry) {
                                window.setTimeout(() => {
                                    void tryFinalizeReward(attempt + 1);
                                }, 750);
                                return;
                            }

                            rewardClaimedMatchesRef.current.delete(claimKey);
                        } catch {
                            rewardClaimedMatchesRef.current.delete(claimKey);
                        }
                    };

                    void tryFinalizeReward();
                });

                socket.on("altinSkorBasladi", () => {
                    // Game state update handles the golden score UI
                });

                socket.on("lobiyeDon", () => {
                    setView(GameView.LOBBY);
                    setGameState(null);
                    setCard(null);
                    setIsPrimaryInspector(false);
                    setGameOverData(null);
                    setTransition(null);
                    setCardFaceTheme(null);
                    setCardBackTheme(null);
                });

                socket.on("odadanAtildin", () => {
                    router.push("/");
                });

                socket.on("hata", (msg: string) => {
                    console.error("Socket error:", msg);
                    setEntryError(msg);
                    const normalizedMessage = msg.toLocaleLowerCase("tr-TR");
                    if (normalizedMessage.includes("bulunamad") || normalizedMessage.includes("found")) {
                        router.push("/");
                    }
                });
            } catch {
                if (isMounted) {
                    setEntryError("Guvenlik dogrulamasi baslatilamadi. Lutfen tekrar deneyin.");
                }
            }
        }

        void connectToRoom();

        return () => {
            isMounted = false;
            activeSocket?.disconnect();
        };
    }, [isRoomClientReady, roomCode, router, session?.user?.id, session?.user?.name, showUsernamePrompt, storedUsername]);

    // Actions

    const emit = useCallback(
        (event: string, data?: unknown) => {
            socketRef.current?.emit(event, data);
        },
        []
    );

    const isHost = myPlayerId && creatorPlayerId ? myPlayerId === creatorPlayerId : false;

    const handleIdentitySave = useCallback(async () => {
        const nextDisplayName = identityDraftName.trim();

        if (!nextDisplayName) {
            setIdentityError("Gecerli bir gorunen ad gir.");
            return;
        }

        if (!canEditIdentity) {
            setIdentityError("Mac basladiktan sonra gorunen ad degistirilemez.");
            return;
        }

        if (nextDisplayName === currentVisibleName) {
            setShowIdentityEditor(false);
            setIdentityError("");
            return;
        }

        setIdentitySaving(true);
        setIdentityError("");

        try {
            if (isAuthenticatedRoomUser) {
                const response = await fetch("/api/user/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        displayName: nextDisplayName,
                    }),
                });

                if (!response.ok) {
                    const payload = (await response.json().catch(() => null)) as {
                        error?: string;
                    } | null;
                    setIdentityError(payload?.error || "Gorunen ad guncellenemedi.");
                    return;
                }

                const payload = (await response.json()) as {
                    profile?: {
                        displayName?: string | null;
                    };
                };
                const persistedDisplayName =
                    payload.profile?.displayName?.trim() || nextDisplayName;

                window.localStorage.setItem("tabu_username", persistedDisplayName);
                setPlayers((currentPlayers) =>
                    currentPlayers.map((player) =>
                        player.playerId === myPlayerId
                            ? { ...player, ad: persistedDisplayName }
                            : player
                    )
                );
                setIdentityDraftName(persistedDisplayName);
                setShowIdentityEditor(false);
                setIdentitySaving(false);

                socketRef.current?.emit(
                    "gorunen_ad_guncelle",
                    { displayName: persistedDisplayName },
                    (response: { ok: boolean; error?: string; displayName?: string }) => {
                        if (!response.ok) {
                            setEntryError(response.error || "Lobi gorunen adi guncellenemedi.");
                            return;
                        }

                        const syncedDisplayName = response.displayName || persistedDisplayName;
                        window.localStorage.setItem("tabu_username", syncedDisplayName);
                        setPlayers((currentPlayers) =>
                            currentPlayers.map((player) =>
                                player.playerId === myPlayerId
                                    ? { ...player, ad: syncedDisplayName }
                                    : player
                            )
                        );
                    }
                );
                return;
            }

            const socket = socketRef.current;
            if (!socket) {
                setIdentityError("Baglanti bulunamadi.");
                return;
            }

            const result = await new Promise<{
                ok: boolean;
                error?: string;
                displayName?: string;
            }>((resolve) => {
                socket.emit(
                    "gorunen_ad_guncelle",
                    { displayName: nextDisplayName },
                    (response: {
                        ok: boolean;
                        error?: string;
                        displayName?: string;
                    }) => resolve(response)
                );
            });

            if (!result.ok) {
                setIdentityError(result.error || "Gorunen ad guncellenemedi.");
                return;
            }

            const confirmedDisplayName = result.displayName || nextDisplayName;
            window.localStorage.setItem("tabu_username", confirmedDisplayName);
            setPlayers((currentPlayers) =>
                currentPlayers.map((player) =>
                    player.playerId === myPlayerId
                        ? { ...player, ad: confirmedDisplayName }
                        : player
                )
            );
            setIdentityDraftName(confirmedDisplayName);
            setShowIdentityEditor(false);
        } catch {
            setIdentityError("Gorunen ad guncellenemedi.");
        } finally {
            setIdentitySaving(false);
        }
    }, [
        canEditIdentity,
        currentVisibleName,
        identityDraftName,
        isAuthenticatedRoomUser,
        myPlayerId,
    ]);

    const handleStartGame = useCallback(() => {
        emit(ROOM_START_GAME_EVENT, {
            seciliKategoriler: selectedCategories,
            seciliZorluklar: selectedDifficulties,
            ayarlar: settings,
        });
    }, [emit, selectedCategories, selectedDifficulties, settings]);

    const handleWordAction = useCallback(
        (action: "dogru" | "tabu" | "pas") => {
            emit("oyunVerisi", { eylem: action });
        },
        [emit]
    );

    // Render

    const renderGameContent = () => {
        if (view === GameView.TRANSITION && transition) {
            return <TransitionScreen transition={transition} cardBackTheme={cardBackTheme} />;
        }

        if (view === GameView.PLAYING) {
            return (
                <ActiveGame
                    gameState={gameState}
                    card={card}
                    myRole={myRole}
                    isPrimaryInspector={isPrimaryInspector}
                    narratorName={narratorName}
                    inspectorName={inspectorName}
                    isHost={isHost as boolean}
                    settings={settings}
                    cardFaceTheme={cardFaceTheme}
                    cardBackTheme={cardBackTheme}
                    onWordAction={handleWordAction}
                    onPauseResume={() => emit(ROOM_GAME_CONTROL_EVENT)}
                    onResetGame={() => emit(ROOM_RESET_GAME_EVENT)}
                />
            );
        }

        if (view === GameView.GAME_OVER && gameOverData) {
            return (
                <GameOverScreen
                    gameOverData={gameOverData}
                    onReturnToLobby={() => emit(ROOM_RESET_GAME_EVENT)}
                />
            );
        }

        // Lobby (default)
        return (
            <Lobby
                roomCode={roomCode}
                players={players}
                settings={settings}
                selectedCategories={selectedCategories}
                selectedDifficulties={selectedDifficulties}
                categories={categories}
                creatorId={creatorId}
                currentSocketId={socketId}
                isHost={isHost as boolean}
                onUpdateSettings={setSettings}
                onInitialSet={(cats, diffs) => {
                    setSelectedCategories(cats);
                    setSelectedDifficulties(diffs);
                    emit("kategoriAyarlariGuncelle", {
                        seciliKategoriler: cats,
                        seciliZorluklar: diffs,
                    });
                }}
                onUpdateCategories={(cats) => {
                    setSelectedCategories(cats);
                    emit("kategoriAyarlariGuncelle", {
                        seciliKategoriler: cats,
                        seciliZorluklar: selectedDifficulties.length > 0 ? selectedDifficulties : [1, 2, 3],
                    });
                }}
                onUpdateDifficulties={(diffs) => {
                    setSelectedDifficulties(diffs);
                    emit("kategoriAyarlariGuncelle", {
                        seciliKategoriler: selectedCategories.length > 0 ? selectedCategories : categories.map(c => c.id),
                        seciliZorluklar: diffs,
                    });
                }}
                onShuffleTeams={() => emit("takimlariKaristir")}
                onSwitchTeam={() => emit(ROOM_SWITCH_TEAM_EVENT)}
                onStartGame={handleStartGame}
                onKickPlayer={(playerId) =>
                    emit("oyuncuyuAt", { targetPlayerId: playerId })
                }
                onTransferHost={(playerId) =>
                    emit("yoneticiligiDevret", { targetPlayerId: playerId })
                }
            />
        );
    };

    if (!isRoomClientReady) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 dark:bg-slate-900">
                <div className="rounded-3xl border border-gray-200 bg-white px-8 py-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                        Lobby Yukleniyor
                    </div>
                    <div className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                        Oda bilgileri hazirlaniyor.
                    </div>
                </div>
            </main>
        );
    }

    return (
        <>
            {/* Username Prompt */}
            {showUsernamePrompt && (
                <UsernamePrompt
                    onConfirm={(username) => {
                        localStorage.setItem("tabu_username", username);
                        setHasConfirmedUsername(true);
                    }}
                />
            )}

            <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
                {/* Mobile Menu Toggles */}
                {isMobile && (
                    <div className="absolute top-4 left-4 z-50 flex gap-2">
                        <button
                            onClick={() => setSidebarAOpen((prev) => !prev)}
                            className="bg-red-600 text-white p-2.5 rounded-lg shadow-md"
                        >
                            <Menu size={20} />
                        </button>
                        <button
                            onClick={() => setSidebarBOpen((prev) => !prev)}
                            className="bg-blue-600 text-white p-2.5 rounded-lg shadow-md"
                        >
                            <Menu size={20} />
                        </button>
                    </div>
                )}

                {/* Team A Sidebar (Red) */}
                <Sidebar
                    team="A"
                    players={players}
                    creatorId={creatorId}
                    creatorPlayerId={creatorPlayerId}
                    currentSocketId={socketId}
                    currentPlayerId={myPlayerId}
                    isOpen={sidebarAOpen}
                    onToggle={() => setSidebarAOpen((prev) => !prev)}
                    isMobile={isMobile}
                    onSwitchTeam={
                        view === GameView.LOBBY
                            ? () => emit(ROOM_SWITCH_TEAM_EVENT)
                            : undefined
                    }
                />

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
                    {/* Header Buttons */}
                    <div className="absolute top-4 right-6 z-30 flex items-start gap-2">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!canEditIdentity) return;
                                    setIdentityDraftName(currentVisibleName);
                                    setIdentityError("");
                                    setShowIdentityEditor((current) => !current);
                                }}
                                className={`flex max-w-[min(10.5rem,calc(100vw-10rem))] items-center gap-2 rounded-full border bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur dark:bg-slate-800/95 ${
                                    canEditIdentity
                                        ? "border-gray-100 text-gray-700 hover:text-indigo-600 dark:border-slate-700 dark:text-gray-200 dark:hover:text-indigo-300"
                                        : "border-amber-200/70 text-gray-700 dark:border-amber-700/40 dark:text-gray-200"
                                }`}
                            >
                                {currentAvatarUrl ? (
                                    <Image
                                        src={currentAvatarUrl}
                                        alt=""
                                        width={30}
                                        height={30}
                                        unoptimized
                                        className="h-8 w-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                                        <UserRound size={14} />
                                    </div>
                                )}
                                <div className="max-w-[6.5rem] truncate text-sm font-bold">
                                    {currentVisibleName}
                                </div>
                                {canEditIdentity ? <Pencil size={14} /> : <Lock size={14} />}
                            </button>

                            {showIdentityEditor && canEditIdentity ? (
                                <div className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                                                Görünen Adı Değiştir
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {isAuthenticatedRoomUser
                                                    ? "Kayıtlı hesaplarda bu ad lobby ve oyunda görünür."
                                                    : "Guest oyuncular yalnız bu lobby için ad değiştirir."}
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={identityDraftName}
                                            onChange={(event) => setIdentityDraftName(event.target.value)}
                                            maxLength={60}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                                        />
                                        <div className="text-[11px] text-gray-400 dark:text-gray-500">
                                            Oyun başlayınca isim kilitlenir. Yalnız kendi görünen adını değiştirebilirsin.
                                        </div>
                                        {identityError ? (
                                            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                                                {identityError}
                                            </div>
                                        ) : null}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowIdentityEditor(false);
                                                    setIdentityDraftName(currentVisibleName);
                                                    setIdentityError("");
                                                }}
                                                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                                            >
                                                Vazgeç
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleIdentitySave()}
                                                disabled={identitySaving}
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Save size={14} />
                                                {identitySaving ? "Kaydediliyor" : "Kaydet"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        {session?.user && (
                            <button
                                onClick={() => setShowDashboard(true)}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 transition-all"
                            >
                                <LayoutDashboard size={20} />
                            </button>
                        )}
                        <button
                            onClick={() => setShowAnnouncements(true)}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 transition-all"
                        >
                            <Megaphone size={20} />
                        </button>
                        <button
                            onClick={() => setShowRules(true)}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:scale-105 transition-all"
                        >
                            <Book size={20} />
                        </button>
                        <button
                            onClick={() =>
                                setTheme(theme === "dark" ? "light" : "dark")
                            }
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 hover:scale-105 transition-all"
                        >
                            <span className="relative flex h-5 w-5 items-center justify-center">
                                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            </span>
                        </button>
                    </div>

                    {/* Connection indicator */}
                    {!isConnected && (
                        <div className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-800/30">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Bağlantı kesildi
                        </div>
                    )}

                    {entryError ? (
                        <div className="absolute top-16 left-4 z-50 max-w-sm rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive shadow-lg">
                            {entryError}
                        </div>
                    ) : null}

                    {/* Game Area */}
                    {view === GameView.LOBBY ? (
                        <div className="h-full overflow-y-auto flex items-center justify-center">
                            {renderGameContent()}
                        </div>
                    ) : (
                        renderGameContent()
                    )}
                </main>

                {/* Team B Sidebar (Blue) */}
                <Sidebar
                    team="B"
                    players={players}
                    creatorId={creatorId}
                    creatorPlayerId={creatorPlayerId}
                    currentSocketId={socketId}
                    currentPlayerId={myPlayerId}
                    isOpen={sidebarBOpen}
                    onToggle={() => setSidebarBOpen((prev) => !prev)}
                    isMobile={isMobile}
                    onSwitchTeam={
                        view === GameView.LOBBY
                            ? () => emit(ROOM_SWITCH_TEAM_EVENT)
                            : undefined
                    }
                />

                {/* Rules Modal */}
                <RulesModal
                    isOpen={showRules}
                    onClose={() => setShowRules(false)}
                />

                {/* Announcements Modal */}
                <AnnouncementsModal
                    isOpen={showAnnouncements}
                    onClose={() => setShowAnnouncements(false)}
                />

                {/* Dashboard Overlay */}
                {session?.user && (
                    <DashboardOverlay
                        isOpen={showDashboard}
                        onClose={() => setShowDashboard(false)}
                    />
                )}
            </div>
        </>
    );
}















