"use client";

import { useState, useEffect, useCallback, useRef, useTransition, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/game/sidebar";
import { Lobby } from "@/components/game/lobby";
import { RulesModal } from "@/components/game/rules-modal";
import { AnnouncementsModal } from "@/components/game/announcements-modal";
import { DashboardOverlay } from "@/components/game/dashboard-overlay";
import { Moon, Sun, Megaphone, Book, Menu, LayoutDashboard } from "lucide-react";
import { useTheme } from "next-themes";
import type { ResolvedCardFaceTheme } from "@/lib/cosmetics/card-face";
import type { ResolvedCardBackTheme } from "@/lib/cosmetics/card-back";
import { ROOM_ROLE_GUESSER } from "@/lib/game/room-display";
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

const ROOM_CLIENT_BOOTSTRAP_PENDING = "__room_client_bootstrap_pending__";

function subscribeRoomClientBootstrap(onStoreChange: () => void): () => void {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    window.addEventListener("storage", onStoreChange);
    return () => window.removeEventListener("storage", onStoreChange);
}

function getRoomClientBootstrapSnapshot(): string {
    if (typeof window === "undefined") {
        return ROOM_CLIENT_BOOTSTRAP_PENDING;
    }

    return window.localStorage.getItem("tabu_username") || "";
}

function getRoomClientBootstrapServerSnapshot(): string {
    return ROOM_CLIENT_BOOTSTRAP_PENDING;
}

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
    const rewardClaimedRoomsRef = useRef<Set<string>>(new Set());

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
    const storedUsername = useSyncExternalStore(
        subscribeRoomClientBootstrap,
        getRoomClientBootstrapSnapshot,
        getRoomClientBootstrapServerSnapshot
    );
    const isRoomClientReady = storedUsername !== ROOM_CLIENT_BOOTSTRAP_PENDING;
    const showUsernamePrompt =
        isRoomClientReady &&
        !hasConfirmedUsername &&
        storedUsername.trim().length === 0;

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

        const username = storedUsername || "Oyuncu";
        const guestToken = session?.user?.id
            ? undefined
            : window.sessionStorage.getItem("tabu_guestToken") || undefined;

        const socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
            if (socket.id) setSocketId(socket.id);
            socket.emit("room:request", {
                kullaniciAdi: username,
                odaKodu: roomCode,
                ...(guestToken ? { guestToken } : {}),
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
            if (rewardClaimedRoomsRef.current.has(roomCode)) return;

            rewardClaimedRoomsRef.current.add(roomCode);
            fetch("/api/game/match/finalize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomCode,
                }),
            }).catch(() => {
                rewardClaimedRoomsRef.current.delete(roomCode);
            });
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
            const normalizedMessage = msg.toLocaleLowerCase("tr-TR");
            if (normalizedMessage.includes("bulunamad") || normalizedMessage.includes("found")) {
                router.push("/");
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [isRoomClientReady, roomCode, router, session?.user?.id, showUsernamePrompt, storedUsername]);

    // Actions

    const emit = useCallback(
        (event: string, data?: unknown) => {
            socketRef.current?.emit(event, data);
        },
        []
    );

    const isHost = myPlayerId && creatorPlayerId ? myPlayerId === creatorPlayerId : false;

    const handleStartGame = useCallback(() => {
        emit("oyunBaslatİsteği", {
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
                    onPauseResume={() => emit("oyunKontrolİsteği")}
                    onResetGame={() => emit("oyunuSifirlaİsteği")}
                />
            );
        }

        if (view === GameView.GAME_OVER && gameOverData) {
            return (
                <GameOverScreen
                    gameOverData={gameOverData}
                    onReturnToLobby={() => emit("oyunuSifirlaİsteği")}
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
        return null;
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
                            ? () => emit("takimDegistirİsteği")
                            : undefined
                    }
                />

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
                    {/* Header Buttons */}
                    <div className="absolute top-4 right-6 z-30 flex gap-2">
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
                            ? () => emit("takimDegistirİsteği")
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








