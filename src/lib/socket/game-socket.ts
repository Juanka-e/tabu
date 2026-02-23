import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getNextWord, clearWordPool } from "./word-service";
import { getVisibleCategories } from "./category-service";

// ─── Types ─────────────────────────────────────────────────────

interface BanList {
    playerIds: Set<string>;
    ips: Set<string>;
}

interface PlayerData {
    id: string;
    playerId: string;
    ad: string;
    takim: "A" | "B" | null;
    online: boolean;
    rol: "Oyuncu" | "İzleyici" | "Anlatıcı" | "Gözetmen" | "Tahminci";
    ip: string;
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
    aktifKart: unknown;
    altinSkorAktif: boolean;
    kalanGecisSuresi?: number;
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

// ─── State ─────────────────────────────────────────────────────

const rooms = new Map<string, RoomData>();
const wordActionTimestamps = new Map<string, number>();
const roomWordActionTimestamps = new Map<string, number>();
const WORD_ACTION_COOLDOWN_MS = 500;

// Reverse index: socketId → roomCode (O(1) room lookup)
const socketToRoom = new Map<string, string>();

// Rate limiting
interface RateLimitEntry {
    count: number;
    resetAt: number;
    timeout: ReturnType<typeof setTimeout>;
}
const roomJoinAttempts = new Map<string, RateLimitEntry>();

// Rate limit settings from .env (can be disabled for localhost/testing)
const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== "false";
const ROOM_JOIN_WINDOW_MS = parseInt(process.env.ROOM_JOIN_WINDOW_SECONDS || "60", 10) * 1000;
const ROOM_JOIN_MAX_ATTEMPTS = parseInt(process.env.ROOM_JOIN_MAX_ATTEMPTS || "100", 10);

// Admin Transfer Timeout
const roomAdminTimeouts = new Map<string, NodeJS.Timeout>();
const ADMIN_TIMEOUT_MS = parseInt(process.env.ADMIN_TIMEOUT_MS || "180000", 10); // Default 3 mins

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
    if (process.env.TRUST_PROXY === "true") {
        const headerIp = socket.handshake.headers?.["x-forwarded-for"];
        if (headerIp) {
            const ip = Array.isArray(headerIp) ? headerIp[0] : headerIp;
            return normalizeIp(ip.split(",")[0].trim());
        }
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
        aktifKart: null,
        altinSkorAktif: false,
    };
}

function sanitizePlayerName(name: unknown): string {
    return String(name || "")
        .trim()
        .slice(0, 50)
        .replace(/[<>]/g, "");
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
    playerId: z.string().uuid().optional(),
});

const KategoriAyarlariSchema = z.object({
    seciliKategoriler: z.array(z.number().int().positive()).max(100),
    seciliZorluklar: z.array(z.number().int().min(1).max(3)).max(3),
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
        const sanitizedPlayers = room.oyuncular.map(({ ip, ...rest }) => rest);
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

        room.oyunDurumu.kalanGecisSuresi = 10;
        persistRoom(room);

        io.to(room.odaKodu).emit("turGecisiBaslat", {
            anlatici: { ad: narrator.ad, takim: narrator.takim },
            gozetmen: inspector
                ? { ad: inspector.ad, takim: inspector.takim }
                : null,
            kalanSure: room.oyunDurumu.kalanGecisSuresi,
            creatorId: room.creatorId,
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
                        startTurn(roomCode, currentRoom, narrator, inspector);
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
        inspector: PlayerData | null
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
        currentRoom.oyunDurumu.kalanPasHakki = 3;

        try {
            const card = await getNextWord(
                currentRoom.odaKodu,
                currentRoom.gecerliKategoriIdleri,
                currentRoom.gecerliZorlukSeviyeleri
            );

            currentRoom.oyunDurumu.aktifKart = card;
            persistRoom(currentRoom);

            broadcastTurnInfo(currentRoom, narrator, inspector, card);
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
        card: unknown
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
                rol = "Gözetmen";
            }

            const shouldSeeCard = rol === "Anlatıcı" || rol === "Gözetmen";

            playerSocket.emit("yeniTurBilgisi", {
                rol,
                isPrimaryGozetmen,
                kart: shouldSeeCard ? card : null,
                anlaticiAd: narrator.ad,
                gozetmenAd: inspector ? inspector.ad : "-",
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

        // 1. Socket-level spam prevention (prevents a single user from macro-clicking)
        const lastActionAt = wordActionTimestamps.get(socket.id) || 0;
        if (now - lastActionAt < WORD_ACTION_COOLDOWN_MS) return;
        wordActionTimestamps.set(socket.id, now);

        // 2. Room-level spam prevention (prevents 50 opponents clicking "tabu" at the exact same time)
        const roomLastActionAt = roomWordActionTimestamps.get(room.odaKodu) || 0;
        if (now - roomLastActionAt < WORD_ACTION_COOLDOWN_MS) return;

        const narrator = room.oyunDurumu.anlatici;
        if (
            !narrator ||
            room.oyunDurumu.oyunDurduruldu ||
            room.oyunDurumu.gecisEkraninda
        )
            return;

        const player = room.oyuncular.find((p) => p.id === socket.id);
        if (!player) return;

        // Tabu can only be pressed by opponent or narrator
        if (
            action === "tabu" &&
            narrator.takim === player.takim &&
            narrator.id !== player.id
        )
            return;

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

            // Mark the room action time only ONCE the action is fully verified and DB is hit
            roomWordActionTimestamps.set(room.odaKodu, now);

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
        // ── Room Join / Create ──
        socket.on(
            "odaİsteği",
            async (rawPayload: unknown) => {
                const parsed = OdaIstegiSchema.safeParse(rawPayload);
                if (!parsed.success) {
                    socket.emit("hata", "Geçersiz istek verisi.");
                    return;
                }
                const { kullaniciAdi, odaKodu, playerId } = parsed.data;
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
                    const sanitizedName = sanitizePlayerName(kullaniciAdi);
                    if (!sanitizedName) {
                        socket.emit("hata", "Geçerli bir kullanıcı adı girin.");
                        return;
                    }

                    // Determine effective player ID once
                    // If client sent an ID, use it. Otherwise generate new one.
                    let effectivePlayerId = playerId;
                    let isNewId = false;
                    if (!effectivePlayerId) {
                        effectivePlayerId = uuidv4();
                        isNewId = true;
                    }

                    const requestedCode = odaKodu
                        ? String(odaKodu).toUpperCase()
                        : undefined;
                    let targetCode = requestedCode;
                    let room = targetCode ? getRoom(targetCode) : undefined;

                    if (!room) {
                        if (requestedCode) {
                            socket.emit("hata", "Bu oda bulunamadı.");
                            return;
                        }
                        targetCode = generateRoomCode();
                        room = {
                            odaKodu: targetCode,
                            creatorId: socket.id,
                            creatorPlayerId: effectivePlayerId, // Use effective ID
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

                    const existingPlayer = room.oyuncular.find(
                        (player) => player.playerId === effectivePlayerId
                    );

                    if (existingPlayer) {
                        existingPlayer.id = socket.id;
                        existingPlayer.ad = sanitizedName;
                        existingPlayer.online = true;
                        existingPlayer.ip = ip;

                        // If this player is the creator, update the creatorId (socket ID)
                        // This fixes the issue where refreshing lost admin rights
                        if (existingPlayer.playerId === room.creatorPlayerId) {
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
                            room.oyunDurumu.anlatici.playerId === existingPlayer.playerId
                        ) {
                            room.oyunDurumu.anlatici.id = socket.id;
                        }
                    } else {
                        const isSpectator = room.oyunDurumu.oyunAktifMi;
                        const yeniOyuncu: PlayerData = {
                            id: socket.id,
                            playerId: effectivePlayerId,
                            ad: sanitizedName,
                            takim: isSpectator ? null : "A",
                            online: true,
                            rol: isSpectator ? "İzleyici" : "Oyuncu",
                            ip,
                        };
                        room.oyuncular.push(yeniOyuncu);

                        // Only emit if we generated a new ID
                        if (isNewId) {
                            socket.emit("kimlikAta", effectivePlayerId);
                        }
                    }

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
        socket.on(
            "oyunBaslatİsteği",
            async ({
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

                room.ayarlar = {
                    sure: parseInt(String(ayarlar.sure), 10),
                    mod: ayarlar.mod as "tur" | "skor",
                    deger: parseInt(String(ayarlar.deger), 10),
                };

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
                };

                persistRoom(room);
                io.to(room.odaKodu).emit("oyunBasladi");
                startNewRound(room.odaKodu);
            }
        );

        // ── Pause / Resume ──
        socket.on("oyunKontrolİsteği", () => {
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
        });

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
        socket.on("oyunuSifirlaİsteği", () => {
            const room = getRoomBySocketId(socket.id);
            if (!room) return;
            const player = room.oyuncular.find((p) => p.id === socket.id);

            // Allow reset if admin OR game is not active (just in case)
            // But strict admin check is safer for "reset game"
            if (!player || player.playerId !== room.creatorPlayerId) return;

            resetGame(room);
            persistRoom(room);
        });

        // ── Switch Team ──
        socket.on("takimDegistirİsteği", () => {
            const room = getRoomBySocketId(socket.id);
            if (!room || room.oyunDurumu.oyunAktifMi) return;

            const player = room.oyuncular.find((p) => p.id === socket.id);
            if (!player) return;
            player.takim = player.takim === "A" ? "B" : "A";
            persistRoom(room);
            broadcastLobby(room);
        });

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
            socketToRoom.delete(socket.id);
            const room = getRoomBySocketId(socket.id);
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
