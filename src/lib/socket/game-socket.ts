import { Server, Socket } from "socket.io";
import { z } from "zod";
import { getToken } from "next-auth/jwt";
import { getPlayerAppearanceSnapshot, getPlayerCardCosmeticsSnapshot } from "@/lib/economy";
import { createEmptyRoomCardThemes, resolveRoomCardThemes, type RoomCardThemePayload } from "@/lib/cosmetics/room-card-themes";
import { prisma } from "@/lib/prisma";
import { resolveSocketPlayerIdentity } from "@/lib/security/player-identity";
import { verifyCaptchaForAction } from "@/lib/security/captcha";
import { evaluateRoomRequestPolicy } from "@/lib/system-settings/policies";
import { getSystemSettings } from "@/lib/system-settings/service";
import { clearExpiredSuspensions, isSuspensionActive } from "@/lib/moderation/service";
import { getNextWord, clearWordPool } from "./word-service";
import { getVisibleCategories } from "./category-service";
import type { PlayerCosmetics } from "@/types/game";

// ─── Types ─────────────────────────────────────────────────────

interface BanList {
    playerIds: Set<string>;
    ips: Set<string>;
}

interface PlayerData {
    id: string;
    playerId: string;
    userId: number | null;
    ad: string;
    takim: "A" | "B" | null;
    online: boolean;
    rol: "Oyuncu" | "İzleyici" | "Anlatıcı" | "Gözetmen" | "Tahminci";
    ip: string;
    cosmetics: PlayerCosmetics;
}

interface NarratorInfo {
    id: string;
    playerId: string;
    ad: string;
    takim: "A" | "B";
}

interface GameStateData {
    oyunAktifMi: boolean;
    oyunDurduruldu: boolean;
    gecisEkraninda: boolean;
    mevcutTur: number;
    toplamTur: number;
    kalanZaman: number;
    kalanPasHakki: number;
    skor: { A: number; B: number };
    anlatacakTakim: "A" | "B";
    takimA_anlaticiIndex: number;
    takimB_anlaticiIndex: number;
    anlatici: NarratorInfo | null;
    gozetmen: NarratorInfo | null;
    aktifKart: unknown;
    altinSkorAktif: boolean;
    kalanGecisSuresi?: number;
    basladiAt?: number | null;
    bittiAt?: number | null;
}

interface RoomData {
    odaKodu: string;
    creatorId: string;
    creatorPlayerId: string; // Persistent ID for admin
    oyuncular: PlayerData[];
    ayarlar: { sure: number; mod: "tur" | "skor"; deger: number };
    gecerliKategoriIdleri: number[];
    gecerliZorlukSeviyeleri: number[];
    seciliKategoriler?: number[];
    seciliZorluklar?: number[];
    oyunDurumu: GameStateData;
    zamanlayici: ReturnType<typeof setInterval> | null;
    banList: BanList;
}

export interface RoomMatchSnapshot {
    odaKodu: string;
    oyunAktifMi: boolean;
    skor: { A: number; B: number };
    matchStartedAt: string | null;
    sureSeconds: number | null;
    oyuncular: Array<{
        playerId: string;
        userId: number | null;
        ad: string;
        takim: "A" | "B" | null;
    }>;
}

// ─── State ─────────────────────────────────────────────────────

const globalForGameSocket = globalThis as typeof globalThis & {
    __tabuGameSocketState?: {
        rooms: Map<string, RoomData>;
        wordActionTimestamps: Map<string, number>;
        socketToRoom: Map<string, string>;
        roomJoinAttempts: Map<string, RateLimitEntry>;
        roomAdminTimeouts: Map<string, NodeJS.Timeout>;
    };
};

const sharedGameSocketState =
    globalForGameSocket.__tabuGameSocketState ??
    (globalForGameSocket.__tabuGameSocketState = {
        rooms: new Map<string, RoomData>(),
        wordActionTimestamps: new Map<string, number>(),
        socketToRoom: new Map<string, string>(),
        roomJoinAttempts: new Map<string, RateLimitEntry>(),
        roomAdminTimeouts: new Map<string, NodeJS.Timeout>(),
    });

const rooms = sharedGameSocketState.rooms;
const wordActionTimestamps = sharedGameSocketState.wordActionTimestamps;
const WORD_ACTION_COOLDOWN_MS = 200;

// Reverse index: socketId → roomCode (O(1) room lookup)
const socketToRoom = sharedGameSocketState.socketToRoom;

// Rate limiting
interface RateLimitEntry {
    count: number;
    resetAt: number;
    timeout: ReturnType<typeof setTimeout>;
}
const roomJoinAttempts = sharedGameSocketState.roomJoinAttempts;

// Rate limit settings from .env (can be disabled for localhost/testing)
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== "false";
const ROOM_JOIN_WINDOW_MS = parseInt(process.env.ROOM_JOIN_WINDOW_SECONDS || "60", 10) * 1000;
const ROOM_JOIN_MAX_ATTEMPTS = parseInt(process.env.ROOM_JOIN_MAX_ATTEMPTS || "100", 10);

// Admin Transfer Timeout
const roomAdminTimeouts = sharedGameSocketState.roomAdminTimeouts;
const ADMIN_TIMEOUT_MS = parseInt(process.env.ADMIN_TIMEOUT_MS || "180000", 10); // Default 3 mins
const ROOM_START_GAME_EVENTS = ["oyun_baslat", "oyunBaslatİsteği", "oyunBaslatÄ°steÄŸi"] as const;
const ROOM_GAME_CONTROL_EVENTS = ["oyun_kontrol", "oyunKontrolİsteği", "oyunKontrolÄ°steÄŸi"] as const;
const ROOM_RESET_GAME_EVENTS = ["oyun_sifirla", "oyunuSifirlaİsteği", "oyunuSifirlaÄ°steÄŸi"] as const;
const ROOM_SWITCH_TEAM_EVENTS = ["takim_degistir", "takimDegistirİsteği", "takimDegistirÄ°steÄŸi"] as const;
const ROOM_UPDATE_DISPLAY_NAME_EVENT = "gorunen_ad_guncelle";

// ─── Helpers ───────────────────────────────────────────────────

function consumeRateLimit(
    store: Map<string, RateLimitEntry>,
    key: string,
    windowMs: number,
    maxAttempts: number
): { allowed: boolean; retryAfterSeconds?: number; remaining?: number } {
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
        if (entry?.timeout) clearTimeout(entry.timeout);
        const timeout = setTimeout(() => store.delete(key), windowMs);
        if (typeof (timeout as NodeJS.Timeout).unref === "function") {
            (timeout as NodeJS.Timeout).unref();
        }
        entry = { count: 0, resetAt: now + windowMs, timeout };
        store.set(key, entry);
    }

    if (entry.count >= maxAttempts) {
        return {
            allowed: false,
            retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
        };
    }

    entry.count += 1;
    return { allowed: true, remaining: maxAttempts - entry.count };
}

function normalizeIp(rawIp: string | undefined): string {
    if (!rawIp) return "unknown";
    return rawIp.replace(/^::ffff:/, "");
}

function getClientIp(socket: Socket): string {
    const headerIp = socket.handshake.headers?.["x-forwarded-for"];
    if (headerIp) {
        const ip = Array.isArray(headerIp) ? headerIp[0] : headerIp;
        return normalizeIp(ip.split(",")[0].trim());
    }
    return normalizeIp(
        socket.handshake.address || "unknown"
    );
}

function createInitialGameState(): GameStateData {
    return {
        oyunAktifMi: false,
        oyunDurduruldu: false,
        gecisEkraninda: false,
        mevcutTur: 0,
        toplamTur: 0,
        kalanZaman: 60,
        kalanPasHakki: 3,
        skor: { A: 0, B: 0 },
        anlatacakTakim: "A",
        takimA_anlaticiIndex: -1,
        takimB_anlaticiIndex: -1,
        anlatici: null,
        gozetmen: null,
        aktifKart: null,
        altinSkorAktif: false,
        basladiAt: null,
        bittiAt: null,
    };
}

function sanitizePlayerName(name: unknown): string {
    return String(name || "")
        .trim()
        .slice(0, 50)
        .replace(/[<>]/g, "");
}

function normalizeRoomSettings(input: {
    sure: string | number;
    mod: string;
    deger: string | number;
}): { sure: number; mod: "tur" | "skor"; deger: number } {
    const sure = Math.min(120, Math.max(30, Number.parseInt(String(input.sure), 10) || 60));
    const mod = input.mod === "skor" ? "skor" : "tur";
    const rawValue = Number.parseInt(String(input.deger), 10);
    const deger =
        mod === "skor"
            ? Math.min(100, Math.max(10, rawValue || 10))
            : Math.min(30, Math.max(2, rawValue || 2));

    return { sure, mod, deger };
}

function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ─── Zod Schemas ───────────────────────────────────────────────

const OdaIstegiSchema = z.object({
    kullaniciAdi: z.string().min(1).max(50),
    odaKodu: z.string().max(10).optional(),
    guestToken: z.string().min(20).max(512).optional(),
    captchaToken: z.string().min(1).max(4096).optional(),
});

const KategoriAyarlariSchema = z.object({
    seciliKategoriler: z.array(z.number().int().positive()).max(100),
    seciliZorluklar: z.array(z.number().int().min(1).max(3)).max(3),
});

const DisplayNameUpdateSchema = z.object({
    displayName: z.string().trim().min(1).max(60),
});

const OyunVerisiSchema = z.object({
    eylem: z.enum(["dogru", "tabu", "pas"]),
});

// ─── Setup ─────────────────────────────────────────────────────

export function setupGameSocket(io: Server): void {
    function generateRoomCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    function getRoom(roomCode: string): RoomData | undefined {
        return rooms.get(roomCode);
    }

    function getRoomBySocketId(socketId: string): RoomData | undefined {
        const code = socketToRoom.get(socketId);
        return code ? rooms.get(code) : undefined;
    }

    function persistRoom(room: RoomData): void {
        rooms.set(room.odaKodu, room);
    }

    function destroyRoom(roomCode: string): void {
        rooms.delete(roomCode);
        clearWordPool(roomCode);
    }

    function broadcastLobby(room: RoomData): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const sanitizedPlayers = room.oyuncular.map(({ ip, cosmetics, ...rest }) => ({
            ...rest,
            cosmetics: cosmetics ?? createEmptyPlayerCosmetics(),
        }));
        io.to(room.odaKodu).emit("lobiGuncelle", {
            odaKodu: room.odaKodu,
            creatorId: room.creatorId,
            creatorPlayerId: room.creatorPlayerId,
            oyuncular: sanitizedPlayers,
            ayarlar: room.ayarlar,
            seciliKategoriler: room.seciliKategoriler || [],
            seciliZorluklar: room.seciliZorluklar || [],
        });
    }

    async function sendVisibleCategories(socket: Socket): Promise<void> {
        try {
            const categories = await getVisibleCategories();
            if (Array.isArray(categories) && categories.length > 0) {
                socket.emit("kategoriListesiGonder", categories);
            }
        } catch (error) {
            console.error("Visible categories could not be sent", error);
        }
    }

    // ─── Round & Turn Management ───────────────────────────────

    async function startNewRound(roomCode: string): Promise<void> {
        const room = getRoom(roomCode);
        if (!room) return;
        if (!room.oyunDurumu.oyunAktifMi) return;

        if (room.zamanlayici) {
            clearInterval(room.zamanlayici);
        }

        if (
            room.oyunDurumu.anlatacakTakim === "A" &&
            !room.oyunDurumu.altinSkorAktif
        ) {
            room.oyunDurumu.mevcutTur += 1;
            if (
                room.ayarlar.mod === "tur" &&
                room.oyunDurumu.mevcutTur > room.ayarlar.deger
            ) {
                finishGame(roomCode);
                return;
            }
        }

        room.oyunDurumu.gecisEkraninda = true;
        room.oyunDurumu.oyunDurduruldu = false;

        const anlatacakTakim = room.oyunDurumu.anlatacakTakim;
        const teamPlayers = room.oyuncular.filter(
            (player) =>
                player.takim === anlatacakTakim &&
                player.online &&
                player.rol !== "İzleyici"
        );

        if (teamPlayers.length === 0) {
            room.oyunDurumu.anlatacakTakim =
                anlatacakTakim === "A" ? "B" : "A";
            if (
                room.oyunDurumu.anlatacakTakim === "A" &&
                !room.oyunDurumu.altinSkorAktif
            ) {
                room.oyunDurumu.mevcutTur -= 1;
            }
            persistRoom(room);
            setTimeout(() => startNewRound(roomCode), 100);
            return;
        }

        let narrator: PlayerData;
        if (anlatacakTakim === "A") {
            room.oyunDurumu.takimA_anlaticiIndex =
                (room.oyunDurumu.takimA_anlaticiIndex + 1) % teamPlayers.length;
            narrator = teamPlayers[room.oyunDurumu.takimA_anlaticiIndex];
        } else {
            room.oyunDurumu.takimB_anlaticiIndex =
                (room.oyunDurumu.takimB_anlaticiIndex + 1) % teamPlayers.length;
            narrator = teamPlayers[room.oyunDurumu.takimB_anlaticiIndex];
        }

        const opponentTeam = anlatacakTakim === "A" ? "B" : "A";
        const opponentPlayers = room.oyuncular.filter(
            (player) => player.takim === opponentTeam && player.online
        );

        const gozetmenIndex =
            anlatacakTakim === "A"
                ? room.oyunDurumu.takimB_anlaticiIndex
                : room.oyunDurumu.takimA_anlaticiIndex;

        const inspector =
            opponentPlayers.length > 0
                ? opponentPlayers[
                ((gozetmenIndex || 0) + 1) % opponentPlayers.length
                ] || opponentPlayers[0]
                : null;

        const narratorCardThemes = await hydrateNarratorCardThemes(narrator.userId);

        room.oyunDurumu.kalanGecisSuresi = 10;
        persistRoom(room);

        io.to(room.odaKodu).emit("turGecisiBaslat", {
            anlatici: { ad: narrator.ad, takim: narrator.takim },
            gozetmen: inspector
                ? { ad: inspector.ad, takim: inspector.takim }
                : null,
            kalanSure: room.oyunDurumu.kalanGecisSuresi,
            creatorId: room.creatorId,
            cardBackTheme: narratorCardThemes.cardBackTheme,
        });

        room.zamanlayici = setInterval(() => {
            const currentRoom = getRoom(roomCode);
            if (!currentRoom) {
                clearInterval(room.zamanlayici!);
                return;
            }

            if (!currentRoom.oyunDurumu.oyunDurduruldu) {
                currentRoom.oyunDurumu.kalanGecisSuresi =
                    (currentRoom.oyunDurumu.kalanGecisSuresi ?? 0) - 1;
                io.to(roomCode).emit("turGecisDurumGuncelle", {
                    oyunDurduruldu: currentRoom.oyunDurumu.oyunDurduruldu,
                    kalanSure: currentRoom.oyunDurumu.kalanGecisSuresi,
                });

                if ((currentRoom.oyunDurumu.kalanGecisSuresi ?? 0) < 0) {
                    clearInterval(currentRoom.zamanlayici!);
                    const narratorStillOnline = currentRoom.oyuncular.find(
                        (player) => player.id === narrator.id
                    )?.online;
                    if (narratorStillOnline) {
                        currentRoom.oyunDurumu.gecisEkraninda = false;
                        persistRoom(currentRoom);
                        startTurn(roomCode, currentRoom, narrator, inspector, narratorCardThemes);
                    } else {
                        startNewRound(roomCode);
                    }
                }
            }
        }, 1000);
    }

    async function startTurn(
        roomCode: string,
        room: RoomData | undefined,
        narrator: PlayerData,
        inspector: PlayerData | null,
        narratorCardThemes: RoomCardThemePayload
    ): Promise<void> {
        const currentRoom = room || getRoom(roomCode);
        if (!currentRoom || !narrator) return;

        currentRoom.oyunDurumu.kalanZaman = currentRoom.ayarlar.sure;
        currentRoom.oyunDurumu.anlatacakTakim =
            narrator.takim === "A" ? "B" : "A";
        currentRoom.oyunDurumu.anlatici = {
            id: narrator.id,
            playerId: narrator.playerId,
            ad: narrator.ad,
            takim: narrator.takim!,
        };
        currentRoom.oyunDurumu.gozetmen = inspector
            ? {
                id: inspector.id,
                playerId: inspector.playerId,
                ad: inspector.ad,
                takim: inspector.takim!,
            }
            : null;
        currentRoom.oyunDurumu.kalanPasHakki = 3;

        try {
            const card = await getNextWord(
                currentRoom.odaKodu,
                currentRoom.gecerliKategoriIdleri,
                currentRoom.gecerliZorlukSeviyeleri
            );

            currentRoom.oyunDurumu.aktifKart = card;
            persistRoom(currentRoom);

            broadcastTurnInfo(currentRoom, narrator, inspector, card, narratorCardThemes);
            startTimer(currentRoom.odaKodu);
        } catch (error) {
            console.error("Failed to get next word", error);
            io.to(currentRoom.odaKodu).emit(
                "hata",
                (error as Error).message || "Kelime alınamadı."
            );
            currentRoom.oyunDurumu.oyunAktifMi = false;
            persistRoom(currentRoom);
        }
    }

    function broadcastTurnInfo(
        room: RoomData,
        narrator: PlayerData,
        inspector: PlayerData | null,
        card: unknown,
        narratorCardThemes: RoomCardThemePayload
    ): void {
        room.oyuncular.forEach((player) => {
            if (!player.online) return;
            const playerSocket = io.sockets.sockets.get(player.id);
            if (!playerSocket) return;

            let rol = "Tahminci";
            let isPrimaryGozetmen = false;

            if (player.rol === "İzleyici") {
                rol = "İzleyici";
            } else if (player.playerId === narrator.playerId) {
                rol = "Anlatıcı";
            } else if (
                inspector &&
                player.playerId === inspector.playerId
            ) {
                rol = "Gözetmen";
                isPrimaryGozetmen = true;
            } else if (player.takim !== narrator.takim) {
                rol = "Tahminci";
            }

            const shouldSeeCard = rol === "Anlatıcı" || rol === "Gözetmen";

            playerSocket.emit("yeniTurBilgisi", {
                rol,
                isPrimaryGozetmen,
                kart: shouldSeeCard ? card : null,
                anlaticiAd: narrator.ad,
                gozetmenAd: inspector ? inspector.ad : "-",
                cardFaceTheme: narratorCardThemes.cardFaceTheme,
                cardBackTheme: narratorCardThemes.cardBackTheme,
            });
        });
    }

    function startTimer(roomCode: string): void {
        const room = getRoom(roomCode);
        if (!room) return;

        if (room.zamanlayici) {
            clearInterval(room.zamanlayici);
        }

        io.to(roomCode).emit("oyunDurumuGuncelle", {
            ...room.oyunDurumu,
            creatorId: room.creatorId,
            toplamSure: room.ayarlar.sure,
        });

        room.zamanlayici = setInterval(() => {
            const currentRoom = getRoom(roomCode);
            if (!currentRoom) {
                clearInterval(room.zamanlayici!);
                return;
            }

            if (!currentRoom.oyunDurumu.oyunDurduruldu) {
                currentRoom.oyunDurumu.kalanZaman -= 1;
                io.to(roomCode).emit("oyunDurumuGuncelle", {
                    ...currentRoom.oyunDurumu,
                    creatorId: currentRoom.creatorId,
                    toplamSure: currentRoom.ayarlar.sure,
                });

                if (currentRoom.oyunDurumu.kalanZaman <= 0) {
                    startNewRound(roomCode);
                }
            }
        }, 1000);
    }

    // ─── Word Action (dogru / tabu / pas) ──────────────────────

    async function handleWordAction(
        room: RoomData,
        action: string,
        socket: Socket
    ): Promise<void> {
        const now = Date.now();
        const lastActionAt = wordActionTimestamps.get(socket.id) || 0;
        if (now - lastActionAt < WORD_ACTION_COOLDOWN_MS) return;
        wordActionTimestamps.set(socket.id, now);

        const narrator = room.oyunDurumu.anlatici;
        if (
            !narrator ||
            room.oyunDurumu.oyunDurduruldu ||
            room.oyunDurumu.gecisEkraninda
        )
            return;

        const player = room.oyuncular.find((p) => p.id === socket.id);
        if (!player) return;

        const activeInspector = room.oyunDurumu.gozetmen;

        if (action === "tabu") {
            const isNarrator = narrator.id === player.id;
            const isPrimaryInspector = activeInspector?.id === player.id;
            if (!isNarrator && !isPrimaryInspector) return;
        }

        // Dogru and pas can only be pressed by narrator
        if (
            (action === "dogru" || action === "pas") &&
            narrator.id !== socket.id
        )
            return;

        if (action === "pas") {
            if (room.oyunDurumu.kalanPasHakki > 0) {
                room.oyunDurumu.kalanPasHakki -= 1;
            } else {
                return;
            }
        } else if (action === "dogru") {
            room.oyunDurumu.skor[narrator.takim] += 1;
        } else if (action === "tabu") {
            room.oyunDurumu.skor[narrator.takim] -= 1;
        }

        io.to(room.odaKodu).emit("oyunDurumuGuncelle", {
            ...room.oyunDurumu,
            creatorId: room.creatorId,
        });

        // Golden score: finish immediately after correct or tabu
        if (
            room.oyunDurumu.altinSkorAktif &&
            (action === "dogru" || action === "tabu")
        ) {
            finishGame(room.odaKodu);
            return;
        }

        // Score mode: finish if target reached
        if (
            room.ayarlar.mod === "skor" &&
            room.oyunDurumu.skor[narrator.takim] >= room.ayarlar.deger
        ) {
            finishGame(room.odaKodu);
            return;
        }

        if (!["pas", "dogru", "tabu"].includes(action)) return;

        try {
            const card = await getNextWord(
                room.odaKodu,
                room.gecerliKategoriIdleri,
                room.gecerliZorlukSeviyeleri
            );

            room.oyunDurumu.aktifKart = card;
            persistRoom(room);

            // Send card to narrator
            const narratorSocket = io.sockets.sockets.get(narrator.id);
            if (narratorSocket) {
                narratorSocket.emit("kartGuncelle", card);
            }

            // Send card to opponent team (inspectors)
            room.oyuncular.forEach((playerItem) => {
                if (playerItem.online && playerItem.takim !== narrator.takim) {
                    const s = io.sockets.sockets.get(playerItem.id);
                    if (s) {
                        s.emit("kartGuncelle", card);
                    }
                }
            });
        } catch (error) {
            console.error("Failed to fetch next card", error);
            io.to(room.odaKodu).emit(
                "hata",
                (error as Error).message || "Kelime alınamadı."
            );
        }
    }

    // ─── Game End ──────────────────────────────────────────────

    function finishGame(roomCode: string): void {
        const room = getRoom(roomCode);
        if (!room) return;

        // Turn mode: check for golden score on tie
        if (room.ayarlar.mod === "tur" && !room.oyunDurumu.altinSkorAktif) {
            if (room.oyunDurumu.skor.A === room.oyunDurumu.skor.B) {
                room.oyunDurumu.altinSkorAktif = true;
                persistRoom(room);
                io.to(room.odaKodu).emit("altinSkorBasladi");
                startNewRound(roomCode);
                return;
            }
        }

        room.oyunDurumu.oyunAktifMi = false;
        room.oyunDurumu.bittiAt = Date.now();
        if (room.zamanlayici) {
            clearInterval(room.zamanlayici);
        }

        const kazananTakim =
            room.oyunDurumu.skor.A === room.oyunDurumu.skor.B
                ? "Berabere"
                : room.oyunDurumu.skor.A > room.oyunDurumu.skor.B
                    ? "A"
                    : "B";

        io.to(room.odaKodu).emit("oyunBitti", {
            kazananTakim,
            skor: room.oyunDurumu.skor,
        });
    }

    function resetGame(room: RoomData): void {
        if (room.zamanlayici) {
            clearInterval(room.zamanlayici);
        }
        room.oyunDurumu = createInitialGameState();
        room.oyunDurumu.kalanZaman = room.ayarlar.sure || 60;
        room.oyunDurumu.toplamTur = room.ayarlar.deger || 0;

        room.oyuncular.forEach((player) => {
            if (player.rol === "İzleyici") {
                player.rol = "Oyuncu";
                player.takim = "A";
            }
        });

        clearWordPool(room.odaKodu);

        io.to(room.odaKodu).emit("lobiyeDon");
        broadcastLobby(room);
    }

    // ─── Connection Handler ────────────────────────────────────

    io.on("connection", (socket: Socket) => {
        if (!isTrustedSocketOrigin(socket)) {
            socket.emit("hata", "Gecersiz baglanti origin'i.");
            socket.disconnect(true);
            return;
        }
        // ── Room Join / Create ──
        socket.on(
            "room:request",
            async (rawPayload: unknown) => {
                const parsed = OdaIstegiSchema.safeParse(rawPayload);
                if (!parsed.success) {
                    socket.emit("hata", "Geçersiz istek verisi.");
                    return;
                }
                const { kullaniciAdi, odaKodu, guestToken, captchaToken } = parsed.data;
                const ip = getClientIp(socket);

                // Skip rate limit check if disabled (useful for localhost/testing)
                if (RATE_LIMIT_ENABLED) {
                    const rate = consumeRateLimit(
                        roomJoinAttempts,
                        ip,
                        ROOM_JOIN_WINDOW_MS,
                        ROOM_JOIN_MAX_ATTEMPTS
                    );

                    if (!rate.allowed) {
                        socket.emit(
                            "hata",
                            `Çok fazla oda denemesi yaptınız. Lütfen ${rate.retryAfterSeconds} saniye bekleyin.`
                        );
                        return;
                    }
                }

                try {
                    const socketAuthState = await getSocketAuthState(socket);
                    const socketAuthRole = await getSocketAuthRole(socket);
                    if (socketAuthState.isSuspended) {
                        socket.emit(
                            "hata",
                            "Hesabiniz askiya alinmis durumda. Bu yuzeyi kullanamazsiniz."
                        );
                        return;
                    }
                    const effectiveAuthUserId = socketAuthState.userId ?? null;
                    const requestedDisplayName = sanitizePlayerName(kullaniciAdi);
                    const effectiveDisplayName = effectiveAuthUserId
                        ? await resolveRegisteredDisplayName(effectiveAuthUserId)
                        : requestedDisplayName;

                    if (!effectiveDisplayName) {
                        socket.emit("hata", "Geçerli bir kullanıcı adı girin.");
                        return;
                    }

                    const identity = resolveSocketPlayerIdentity(
                        effectiveAuthUserId,
                        guestToken
                    );
                    const effectivePlayerId = identity.playerId;

                    const requestedCode = odaKodu
                        ? String(odaKodu).toUpperCase()
                        : undefined;
                    let targetCode = requestedCode;
                    let room = targetCode ? getRoom(targetCode) : undefined;
                    const existingPlayer = room?.oyuncular.find(
                        (player) => player.playerId === effectivePlayerId
                    );
                    const settings = await getSystemSettings();
                    const roomRequestPolicy = evaluateRoomRequestPolicy({
                        settings,
                        isAuthenticated: Boolean(effectiveAuthUserId),
                        isAdmin: socketAuthRole === "admin",
                        isCreateRequest: !requestedCode,
                        isReconnect: Boolean(existingPlayer),
                    });

                    if (!roomRequestPolicy.allowed) {
                        socket.emit(
                            "hata",
                            roomRequestPolicy.message || "Bu islem su anda kullanima kapali."
                        );
                        return;
                    }

                    const captchaAction = !requestedCode
                        ? "room_create"
                        : !effectiveAuthUserId
                            ? "guest_join"
                            : null;

                    if (captchaAction) {
                        const captchaResult = await verifyCaptchaForAction({
                            action: captchaAction,
                            token: captchaToken ?? null,
                            remoteIp: ip === "unknown" ? null : ip,
                            settings,
                        });

                        if (!captchaResult.ok) {
                            socket.emit(
                                "hata",
                                "Guvenlik dogrulamasi basarisiz. Lutfen tekrar deneyin."
                            );
                            return;
                        }
                    }

                    if (!room) {
                        if (requestedCode) {
                            socket.emit("hata", "Bu oda bulunamadı.");
                            return;
                        }
                        targetCode = generateRoomCode();
                        room = {
                            odaKodu: targetCode,
                            creatorId: socket.id,
                            creatorPlayerId: effectivePlayerId,
                            oyuncular: [],
                            ayarlar: { sure: 60, mod: "tur", deger: 2 },
                            gecerliKategoriIdleri: [],
                            gecerliZorlukSeviyeleri: [],
                            oyunDurumu: createInitialGameState(),
                            zamanlayici: null,
                            banList: {
                                playerIds: new Set(),
                                ips: new Set(),
                            },
                        };
                        persistRoom(room);
                    }

                    if (!room.banList) {
                        room.banList = { playerIds: new Set(), ips: new Set() };
                    }

                    if (room.banList.playerIds.has(effectivePlayerId)) {
                        socket.emit("hata", "Bu odaya yeniden katılma izniniz yok (Banlandınız).");
                        return;
                    }

                    if (ip !== "unknown" && room.banList.ips.has(ip)) {
                        socket.emit("hata", "Bu odaya yeniden katılma izniniz yok (Banlandınız).");
                        return;
                    }

                    const reconnectingPlayer = room.oyuncular.find(
                        (player) => player.playerId === effectivePlayerId
                    );

                    if (reconnectingPlayer) {
                        reconnectingPlayer.id = socket.id;
                        reconnectingPlayer.ad = effectiveDisplayName;
                        reconnectingPlayer.online = true;
                        reconnectingPlayer.ip = ip;
                        if (effectiveAuthUserId) {
                            reconnectingPlayer.userId = effectiveAuthUserId;
                        }
                        await hydratePlayerCosmetics(reconnectingPlayer);

                        // If this player is the creator, update the creatorId (socket ID)
                        // This fixes the issue where refreshing lost admin rights
                        if (reconnectingPlayer.playerId === room.creatorPlayerId) {
                            room.creatorId = socket.id;

                            // Clear any pending admin timeout
                            const timeout = roomAdminTimeouts.get(room.odaKodu);
                            if (timeout) {
                                clearTimeout(timeout);
                                roomAdminTimeouts.delete(room.odaKodu);
                            }
                        }

                        if (
                            room.oyunDurumu.anlatici &&
                            room.oyunDurumu.anlatici.playerId === reconnectingPlayer.playerId
                        ) {
                            room.oyunDurumu.anlatici.id = socket.id;
                        }
                    } else {
                        const isSpectator = room.oyunDurumu.oyunAktifMi;
                        const yeniOyuncu: PlayerData = {
                            id: socket.id,
                            playerId: effectivePlayerId,
                            userId: effectiveAuthUserId,
                            ad: effectiveDisplayName,
                            takim: isSpectator ? null : "A",
                            online: true,
                            rol: isSpectator ? "İzleyici" : "Oyuncu",
                            ip,
                            cosmetics: createEmptyPlayerCosmetics(),
                        };
                        await hydratePlayerCosmetics(yeniOyuncu);
                        room.oyuncular.push(yeniOyuncu);
                    }

                    socket.emit("kimlikAta", {
                        playerId: effectivePlayerId,
                        guestToken: identity.guestToken,
                    });

                    persistRoom(room);
                    socket.join(targetCode!);
                    socketToRoom.set(socket.id, targetCode!);

                    await sendVisibleCategories(socket);

                    if (room.oyunDurumu.oyunAktifMi) {
                        socket.emit("oyunBasladi");
                        socket.emit("oyunDurumuGuncelle", {
                            ...room.oyunDurumu,
                            creatorId: room.creatorId,
                        });
                    }

                    broadcastLobby(room);
                } catch (error) {
                    console.error("odaİsteği failed", error);
                    socket.emit(
                        "hata",
                        (error as Error).message || "Odaya katılırken hata oluştu."
                    );
                }
            }
        );

        // ── Team Shuffle ──
        socket.on("takimlariKaristir", () => {
            const room = getRoomBySocketId(socket.id);
            if (!room) return;
            const player = room.oyuncular.find((p) => p.id === socket.id);
            if (!player || player.playerId !== room.creatorPlayerId) return;

            shuffleArray(room.oyuncular);
            const half = Math.ceil(room.oyuncular.length / 2);
            room.oyuncular.forEach((player, index) => {
                player.takim = index < half ? "A" : "B";
            });
            persistRoom(room);
            broadcastLobby(room);
        });

        // ── Transfer Host ──
        // ── Transfer Host ──
        socket.on(
            "yoneticiligiDevret",
            ({ targetPlayerId }: { targetPlayerId: string }) => {
                const room = getRoomBySocketId(socket.id);
                if (!room) return;
                const player = room.oyuncular.find((p) => p.id === socket.id);
                if (!player || player.playerId !== room.creatorPlayerId) return;

                const newAdmin = room.oyuncular.find(
                    (player) =>
                        player.playerId === targetPlayerId && player.online
                );
                if (newAdmin) {
                    room.creatorId = newAdmin.id;
                    room.creatorPlayerId = newAdmin.playerId;
                    persistRoom(room);
                    broadcastLobby(room);
                    if (room.oyunDurumu.oyunAktifMi) {
                        io.to(room.odaKodu).emit("oyunDurumuGuncelle", {
                            ...room.oyunDurumu,
                            creatorId: room.creatorId,
                        });
                    }
                }
            }
        );

        // ── Kick Player ──
        socket.on(
            "oyuncuyuAt",
            ({ targetPlayerId }: { targetPlayerId: string }) => {
                const room = getRoomBySocketId(socket.id);
                if (!room) return;

                const player = room.oyuncular.find((p) => p.id === socket.id);
                if (!player) return;

                if (player.playerId !== room.creatorPlayerId) return;

                const targetIndex = room.oyuncular.findIndex(
                    (player) => player.playerId === targetPlayerId
                );
                if (targetIndex === -1) return;

                const target = room.oyuncular[targetIndex];
                if (target.id === room.creatorId) return;

                if (!room.banList) {
                    room.banList = { playerIds: new Set(), ips: new Set() };
                }
                room.banList.playerIds.add(target.playerId);
                // Note: We don't have IP on Player type nicely, but we can assume simple ID ban for now 
                // We should add IP to Player type to ban properly but for now ID ban is enough
                if (target.ip && target.ip !== "unknown") {
                    room.banList.ips.add(target.ip);
                }

                if (target.id) {
                    wordActionTimestamps.delete(target.id);
                }

                const targetSocket = io.sockets.sockets.get(target.id);
                if (targetSocket) {
                    targetSocket.emit("odadanAtildin", { odaKodu: room.odaKodu });
                    try {
                        targetSocket.leave(room.odaKodu);
                        targetSocket.disconnect(true);
                    } catch (error) {
                        console.debug("Failed to disconnect kicked player", error);
                    }
                }

                room.oyuncular.splice(targetIndex, 1);

                if (room.oyuncular.length === 0) {
                    if (room.zamanlayici) clearInterval(room.zamanlayici);
                    destroyRoom(room.odaKodu);
                    return;
                }

                if (room.creatorId === target.id) {
                    const nextAdmin =
                        room.oyuncular.find((player) => player.online) ||
                        room.oyuncular[0];
                    if (nextAdmin) {
                        room.creatorId = nextAdmin.id;
                    }
                }

                let shouldRestartRound = false;
                if (
                    room.oyunDurumu.anlatici &&
                    room.oyunDurumu.anlatici.playerId === target.playerId
                ) {
                    room.oyunDurumu.anlatici = null;
                    shouldRestartRound = true;
                }

                persistRoom(room);
                broadcastLobby(room);

                const onlinePlayers = room.oyuncular.filter(
                    (player) => player.online
                );
                if (onlinePlayers.length === 0) {
                    if (room.zamanlayici) clearInterval(room.zamanlayici);
                    destroyRoom(room.odaKodu);
                    return;
                }

                if (room.oyunDurumu.oyunAktifMi) {
                    if (shouldRestartRound) {
                        startNewRound(room.odaKodu);
                    } else {
                        io.to(room.odaKodu).emit("oyunDurumuGuncelle", {
                            ...room.oyunDurumu,
                            creatorId: room.creatorId,
                        });
                    }
                }
            }
        );

        // ── Start Game ──
        const startGameHandler = async ({
                seciliKategoriler,
                seciliZorluklar,
                ayarlar,
            }: {
                seciliKategoriler: number[];
                seciliZorluklar: number[];
                ayarlar: { sure: string | number; mod: string; deger: string | number };
            }) => {
                const room = getRoomBySocketId(socket.id);
                if (!room) return;
                const player = room.oyuncular.find((p) => p.id === socket.id);
                if (!player || player.playerId !== room.creatorPlayerId) return;

                const teamA = room.oyuncular.filter(
                    (player) => player.takim === "A" && player.online
                );
                const teamB = room.oyuncular.filter(
                    (player) => player.takim === "B" && player.online
                );

                if (teamA.length < 2 || teamB.length < 2) {
                    socket.emit(
                        "hata",
                        "Oyunu başlatabilmek için her iki takımda da en az ikişer çevrimiçi oyuncu bulunmalı."
                    );
                    return;
                }

                room.ayarlar = normalizeRoomSettings(ayarlar);

                room.gecerliKategoriIdleri = seciliKategoriler;
                room.gecerliZorlukSeviyeleri = seciliZorluklar;

                if (
                    !room.gecerliKategoriIdleri ||
                    room.gecerliKategoriIdleri.length === 0
                ) {
                    socket.emit("hata", "Lütfen en az bir kategori seçin.");
                    return;
                }
                if (
                    !room.gecerliZorlukSeviyeleri ||
                    room.gecerliZorlukSeviyeleri.length === 0
                ) {
                    socket.emit("hata", "Lütfen en az bir zorluk seviyesi seçin.");
                    return;
                }

                const toplamTur =
                    room.ayarlar.mod === "tur" ? room.ayarlar.deger : 0;

                room.oyunDurumu = {
                    ...room.oyunDurumu,
                    oyunAktifMi: true,
                    skor: { A: 0, B: 0 },
                    mevcutTur: 0,
                    toplamTur,
                    anlatacakTakim: "A",
                    takimA_anlaticiIndex: -1,
                    takimB_anlaticiIndex: -1,
                    altinSkorAktif: false,
                    basladiAt: Date.now(),
                    bittiAt: null,
                };

                persistRoom(room);
                io.to(room.odaKodu).emit("oyunBasladi");
                startNewRound(room.odaKodu);
            };
        for (const eventName of ROOM_START_GAME_EVENTS) {
            socket.on(eventName, startGameHandler);
        }

        // ── Pause / Resume ──
        const gameControlHandler = () => {
            const room = getRoomBySocketId(socket.id);
            if (!room) return;
            const player = room.oyuncular.find((p) => p.id === socket.id);
            if (!player || player.playerId !== room.creatorPlayerId) return;

            room.oyunDurumu.oyunDurduruldu = !room.oyunDurumu.oyunDurduruldu;
            persistRoom(room);

            if (room.oyunDurumu.gecisEkraninda) {
                io.to(room.odaKodu).emit("turGecisDurumGuncelle", {
                    oyunDurduruldu: room.oyunDurumu.oyunDurduruldu,
                    kalanSure: room.oyunDurumu.kalanGecisSuresi,
                });
            } else if (room.oyunDurumu.oyunAktifMi) {
                if (room.oyunDurumu.oyunDurduruldu && room.zamanlayici) {
                    clearInterval(room.zamanlayici);
                } else {
                    startTimer(room.odaKodu);
                }
                io.to(room.odaKodu).emit("oyunDurumuGuncelle", {
                    ...room.oyunDurumu,
                    creatorId: room.creatorId,
                });
            }
        };
        for (const eventName of ROOM_GAME_CONTROL_EVENTS) {
            socket.on(eventName, gameControlHandler);
        }

        // ── Word Action ──
        socket.on(
            "oyunVerisi",
            async (rawPayload: unknown) => {
                const parsed = OyunVerisiSchema.safeParse(rawPayload);
                if (!parsed.success) return;
                const room = getRoomBySocketId(socket.id);
                if (!room || !room.oyunDurumu.oyunAktifMi) return;
                await handleWordAction(room, parsed.data.eylem, socket);
            }
        );

        // ── Reset Game ──
        const resetGameHandler = () => {
            const room = getRoomBySocketId(socket.id);
            if (!room) return;
            const player = room.oyuncular.find((p) => p.id === socket.id);

            // Allow reset if admin OR game is not active (just in case)
            // But strict admin check is safer for "reset game"
            if (!player || player.playerId !== room.creatorPlayerId) return;

            resetGame(room);
            persistRoom(room);
        };
        for (const eventName of ROOM_RESET_GAME_EVENTS) {
            socket.on(eventName, resetGameHandler);
        }

        // ── Switch Team ──
        const switchTeamHandler = () => {
            const room = getRoomBySocketId(socket.id);
            if (!room || room.oyunDurumu.oyunAktifMi) return;

            const player = room.oyuncular.find((p) => p.id === socket.id);
            if (!player) return;
            player.takim = player.takim === "A" ? "B" : "A";
            persistRoom(room);
            broadcastLobby(room);
        };
        for (const eventName of ROOM_SWITCH_TEAM_EVENTS) {
            socket.on(eventName, switchTeamHandler);
        }

        socket.on(
            ROOM_UPDATE_DISPLAY_NAME_EVENT,
            (
                rawPayload: unknown,
                callback?: (response: {
                    ok: boolean;
                    error?: string;
                    displayName?: string;
                }) => void
            ) => {
                const parsed = DisplayNameUpdateSchema.safeParse(rawPayload);
                if (!parsed.success) {
                    callback?.({ ok: false, error: "Gecerli bir gorunen ad girin." });
                    return;
                }

                const room = getRoomBySocketId(socket.id);
                if (!room) {
                    callback?.({ ok: false, error: "Lobi bulunamadi." });
                    return;
                }

                if (room.oyunDurumu.oyunAktifMi) {
                    callback?.({
                        ok: false,
                        error: "Mac basladiktan sonra gorunen ad degistirilemez.",
                    });
                    return;
                }

                const player = room.oyuncular.find((entry) => entry.id === socket.id);
                if (!player) {
                    callback?.({ ok: false, error: "Oyuncu bulunamadi." });
                    return;
                }

                const nextDisplayName = sanitizePlayerName(parsed.data.displayName);
                if (!nextDisplayName) {
                    callback?.({ ok: false, error: "Gecerli bir gorunen ad girin." });
                    return;
                }

                player.ad = nextDisplayName;
                persistRoom(room);
                broadcastLobby(room);

                callback?.({
                    ok: true,
                    displayName: nextDisplayName,
                });
            }
        );

        // ── Update Category Settings ──
        socket.on(
            "kategoriAyarlariGuncelle",
            (rawPayload: unknown) => {
                const parsed = KategoriAyarlariSchema.safeParse(rawPayload);
                if (!parsed.success) {
                    socket.emit("hata", "Geçersiz kategori verisi.");
                    return;
                }
                const { seciliKategoriler, seciliZorluklar } = parsed.data;
                const room = getRoomBySocketId(socket.id);
                if (!room) return;
                const player = room.oyuncular.find((p) => p.id === socket.id);
                if (!player || player.playerId !== room.creatorPlayerId) return;
                if (room.oyunDurumu.oyunAktifMi) return;

                room.seciliKategoriler = seciliKategoriler || [];
                room.seciliZorluklar = seciliZorluklar || [];
                persistRoom(room);

                io.to(room.odaKodu).emit("kategoriAyarlariGuncellendi", {
                    seciliKategoriler: room.seciliKategoriler,
                    seciliZorluklar: room.seciliZorluklar,
                });
            }
        );

        // ── Disconnect ──
        socket.on("disconnect", () => {
            wordActionTimestamps.delete(socket.id);
            const roomCode = socketToRoom.get(socket.id);
            const room = roomCode ? getRoom(roomCode) : undefined;
            socketToRoom.delete(socket.id);
            if (!room) return;

            const player = room.oyuncular.find((p) => p.id === socket.id);
            if (!player) return;

            player.online = false;
            const onlinePlayers = room.oyuncular.filter((p) => p.online);

            if (onlinePlayers.length === 0) {
                // Grace period: wait 15 seconds before destroying room
                // This prevents race condition when homepage disconnects
                // its socket before the /room/[code] page reconnects
                const roomCode = room.odaKodu;
                setTimeout(() => {
                    const currentRoom = getRoom(roomCode);
                    if (!currentRoom) return;
                    const stillOnline = currentRoom.oyuncular.filter(
                        (p) => p.online
                    );
                    if (stillOnline.length === 0) {
                        if (currentRoom.zamanlayici)
                            clearInterval(currentRoom.zamanlayici);

                        // Clear admin timeout
                        const timeout = roomAdminTimeouts.get(roomCode);
                        if (timeout) {
                            clearTimeout(timeout);
                            roomAdminTimeouts.delete(roomCode);
                        }

                        destroyRoom(roomCode);
                    }
                }, 15_000);
                return;
            }

            if (room.creatorId === socket.id) {
                // Admin Disconnect Logic
                // Start Timeout to transfer admin
                const roomCode = room.odaKodu; // Capture room code for timeout closure

                const timeout = setTimeout(() => {
                    const currentRoom = getRoom(roomCode); // Use room code instead of socket.id
                    if (!currentRoom) {
                        roomAdminTimeouts.delete(roomCode);
                        return;
                    }

                    // Check if admin still offline
                    const adminPlayer = currentRoom.oyuncular.find(p => p.playerId === currentRoom.creatorPlayerId);
                    if (adminPlayer && !adminPlayer.online) {
                        const nextAdmin = currentRoom.oyuncular.find(p => p.online);
                        if (nextAdmin) {
                            currentRoom.creatorId = nextAdmin.id;
                            currentRoom.creatorPlayerId = nextAdmin.playerId;
                            persistRoom(currentRoom);
                            broadcastLobby(currentRoom);
                            io.to(roomCode).emit("hata", `Yönetici süresi doldu. Yeni yönetici: ${nextAdmin.ad}`);
                        }
                    }
                    roomAdminTimeouts.delete(roomCode);

                }, ADMIN_TIMEOUT_MS);

                roomAdminTimeouts.set(room.odaKodu, timeout);
            }

            persistRoom(room);
            broadcastLobby(room);
            if (room.oyunDurumu.oyunAktifMi) {
                io.to(room.odaKodu).emit("oyunDurumuGuncelle", {
                    ...room.oyunDurumu,
                    creatorId: room.creatorId,
                });
            }
        });
    });
}

// ─── Metrics ───────────────────────────────────────────────────

export function getRoomMetrics(): {
    aktifLobiSayisi: number;
    onlineKullaniciSayisi: number;
} {
    let onlineKullaniciSayisi = 0;
    rooms.forEach((room) => {
        onlineKullaniciSayisi += room.oyuncular.filter(
            (player) => player.online
        ).length;
    });

    return {
        aktifLobiSayisi: rooms.size,
        onlineKullaniciSayisi,
    };
}

function createEmptyPlayerCosmetics(): PlayerCosmetics {
    return {
        avatarImageUrl: null,
        frameImageUrl: null,
        frameAccentColor: null,
    };
}

function isSecureSocketHandshake(socket: Socket): boolean {
    const forwardedProto = socket.handshake.headers["x-forwarded-proto"];
    const normalizedProto = Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : forwardedProto;

    if (typeof normalizedProto === "string") {
        return normalizedProto.split(",")[0].trim() === "https";
    }

    const origin = socket.handshake.headers.origin;
    if (typeof origin === "string") {
        return origin.startsWith("https://");
    }

    return process.env.NODE_ENV === "production";
}

function isTrustedSocketOrigin(socket: Socket): boolean {
    const origin = socket.handshake.headers.origin;
    if (typeof origin !== "string") {
        return process.env.NODE_ENV !== "production";
    }

    const hostHeader =
        socket.handshake.headers["x-forwarded-host"] ??
        socket.handshake.headers.host;
    const normalizedHost = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    if (!normalizedHost) {
        return process.env.NODE_ENV !== "production";
    }

    try {
        const originUrl = new URL(origin);
        return originUrl.host === normalizedHost;
    } catch {
        return false;
    }
}

async function getSocketAuthState(socket: Socket): Promise<{
    userId: number | null;
    isSuspended: boolean;
}> {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader || !process.env.AUTH_SECRET) {
        return {
            userId: null,
            isSuspended: false,
        };
    }

    const token = await getToken({
        req: {
            headers: {
                cookie: cookieHeader,
            },
        },
        secret: process.env.AUTH_SECRET,
        secureCookie: isSecureSocketHandshake(socket),
    });

    const userId = Number(token?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
        return {
            userId: null,
            isSuspended: false,
        };
    }

    await clearExpiredSuspensions();
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            isSuspended: true,
            suspendedUntil: true,
        },
    });

    if (!user) {
        return {
            userId: null,
            isSuspended: false,
        };
    }

    return {
        userId: isSuspensionActive(user) ? null : user.id,
        isSuspended: isSuspensionActive(user),
    };
}

async function getSocketAuthRole(socket: Socket): Promise<string | null> {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader || !process.env.AUTH_SECRET) {
        return null;
    }

    const token = await getToken({
        req: {
            headers: {
                cookie: cookieHeader,
            },
        },
        secret: process.env.AUTH_SECRET,
        secureCookie: isSecureSocketHandshake(socket),
    });

    return typeof token?.role === "string" ? token.role : null;
}

async function hydrateNarratorCardThemes(userId: number | null): Promise<RoomCardThemePayload> {
    if (!userId) {
        return createEmptyRoomCardThemes();
    }

    try {
        const snapshot = await getPlayerCardCosmeticsSnapshot(userId);
        return resolveRoomCardThemes(snapshot);
    } catch (error) {
        console.error("Narrator card cosmetics could not be loaded", error);
        return createEmptyRoomCardThemes();
    }
}

async function hydratePlayerCosmetics(player: PlayerData): Promise<void> {
    if (!player.userId) {
        player.cosmetics = createEmptyPlayerCosmetics();
        return;
    }

    try {
        player.cosmetics = await getPlayerAppearanceSnapshot(player.userId);
    } catch (error) {
        console.error("Player cosmetics could not be loaded", error);
        player.cosmetics = createEmptyPlayerCosmetics();
    }
}

async function resolveRegisteredDisplayName(userId: number): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            username: true,
            profile: {
                select: {
                    displayName: true,
                },
            },
        },
    });

    if (!user) {
        return null;
    }

    return sanitizePlayerName(user.profile?.displayName || user.username);
}

export function getRoomMatchSnapshot(roomCode: string): RoomMatchSnapshot | null {
    const room = rooms.get(roomCode);
    if (!room) return null;
    const startedAt = room.oyunDurumu.basladiAt ?? null;
    const endedAt = room.oyunDurumu.bittiAt ?? null;
    const sureSeconds =
        startedAt !== null
            ? Math.max(0, Math.round(((endedAt ?? Date.now()) - startedAt) / 1000))
            : null;
    return {
        odaKodu: room.odaKodu,
        oyunAktifMi: room.oyunDurumu.oyunAktifMi,
        skor: room.oyunDurumu.skor,
        matchStartedAt: startedAt !== null ? new Date(startedAt).toISOString() : null,
        sureSeconds,
        oyuncular: room.oyuncular.map((player) => ({
            playerId: player.playerId,
            userId: player.userId ?? null,
            ad: player.ad,
            takim: player.takim,
        })),
    };
}
