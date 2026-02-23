"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Sidebar } from "@/components/game/sidebar";
import { Lobby } from "@/components/game/lobby";
import { RulesModal } from "@/components/game/rules-modal";
import { AnnouncementsModal } from "@/components/game/announcements-modal";
import { Moon, Sun, Megaphone, Book, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
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

// ─── Sub-components ────────────────────────────────────────────────
import { TransitionScreen } from "./_components/transition-screen";
import { ActiveGame } from "./_components/active-game";
import { GameOverScreen } from "./_components/game-over-screen";
import { UsernamePrompt } from "./_components/username-prompt";

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [, startTransition] = useTransition();
    const roomCode = params.code as string;

    // Socket and Auth Identity
    const { data: session } = useSession();
    const myPlayerId = session?.user?.id || "";

    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [socketId, setSocketId] = useState("");

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
    const [myRole, setMyRole] = useState("Tahminci");
    const [narratorName, setNarratorName] = useState("");
    const [inspectorName, setInspectorName] = useState("");

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
    const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);

    useEffect(() => {
        setMounted(true);
        const hasUsername = localStorage.getItem("tabu_username");
        if (!hasUsername) {
            setShowUsernamePrompt(true);
        }
    }, []);

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
        if (showUsernamePrompt) return;

        const username = localStorage.getItem("tabu_username") || "Oyuncu";

        const socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
            if (socket.id) setSocketId(socket.id);
            socket.emit("odaİsteği", {
                kullaniciAdi: username,
                odaKodu: roomCode,
            });
        });

        socket.on("disconnect", () => setIsConnected(false));

        // Note: The server no longer emits 'kimlikAta' because identity
        // is now securely managed via the HttpOnly NextAuth session token.
        // myPlayerId will be determined through server communication when needed or via session payload.

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
        });

        socket.on("turGecisiBaslat", (data: TransitionData) => {
            setView(GameView.TRANSITION);
            setTransition(data);
        });

        socket.on("turGecisDurumGuncelle", (data: { oyunDurduruldu: boolean; kalanSure: number }) => {
            setTransition((prev) =>
                prev ? { ...prev, kalanSure: data.kalanSure } : null
            );
        });

        socket.on("yeniTurBilgisi", (data: TurnInfo) => {
            setMyRole(data.rol);
            setCard(data.kart);
            setNarratorName(data.anlaticiAd);
            setInspectorName(data.gozetmenAd);
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
        });

        socket.on("altinSkorBasladi", () => {
            // Game state update handles the golden score UI
        });

        socket.on("lobiyeDon", () => {
            setView(GameView.LOBBY);
            setGameState(null);
            setCard(null);
            setGameOverData(null);
            setTransition(null);
        });

        socket.on("odadanAtildin", () => {
            router.push("/");
        });

        socket.on("hata", (msg: string) => {
            console.error("Socket error:", msg);
            if (msg.includes("bulunamadı") || msg.includes("found")) {
                router.push("/");
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [roomCode, router, showUsernamePrompt]);

    // ─── Actions ─────────────────────────────────────────────────

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

    // ─── Render ──────────────────────────────────────────────────

    const renderGameContent = () => {
        if (view === GameView.TRANSITION && transition) {
            return <TransitionScreen transition={transition} />;
        }

        if (view === GameView.PLAYING) {
            return (
                <ActiveGame
                    gameState={gameState}
                    card={card}
                    myRole={myRole}
                    narratorName={narratorName}
                    inspectorName={inspectorName}
                    isHost={isHost as boolean}
                    settings={settings}
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

    return (
        <>
            {/* Username Prompt */}
            {showUsernamePrompt && (
                <UsernamePrompt
                    onConfirm={(username) => {
                        localStorage.setItem("tabu_username", username);
                        setShowUsernamePrompt(false);
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
                    currentSocketId={socketRef.current?.id || ""}
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
                        {mounted && (
                            <button
                                onClick={() =>
                                    setTheme(theme === "dark" ? "light" : "dark")
                                }
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 hover:scale-105 transition-all"
                            >
                                {theme === "dark" ? (
                                    <Sun size={20} />
                                ) : (
                                    <Moon size={20} />
                                )}
                            </button>
                        )}
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
                    currentSocketId={socketRef.current?.id || ""}
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
            </div>
        </>
    );
}
