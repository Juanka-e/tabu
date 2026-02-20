// ─── Game State Enums ──────────────────────────────────────────

export enum GameView {
    LOGIN = "LOGIN",
    LOBBY = "LOBBY",
    TRANSITION = "TRANSITION",
    PLAYING = "PLAYING",
    PAUSED = "PAUSED",
    ROUND_END = "ROUND_END",
    GAME_OVER = "GAME_OVER",
}

// ─── Player & Room ─────────────────────────────────────────────

export interface Player {
    id: string;
    playerId: string;
    ad: string;
    takim: "A" | "B" | null;
    online: boolean;
    rol: "Oyuncu" | "İzleyici" | "Anlatıcı" | "Gözetmen" | "Tahminci";
}

export interface RoomSettings {
    sure: number;
    mod: "tur" | "skor";
    deger: number;
}

export interface RoomData {
    odaKodu: string;
    creatorId: string;
    creatorPlayerId: string;
    oyuncular: Player[];
    ayarlar: RoomSettings;
    seciliKategoriler: number[];
    seciliZorluklar: number[];
    banList?: {
        playerIds: Set<string>;
        ips: Set<string>;
    };
}

// ─── Card ──────────────────────────────────────────────────────

export type Difficulty = 1 | 2 | 3;
export type DifficultyLabel = "easy" | "medium" | "hard";

export interface CardData {
    id: number;
    word: string;
    difficulty: Difficulty;
    categoryColor: string | null;
    taboo: string[];
}

// ─── Game State (from server) ──────────────────────────────────

export interface GameState {
    oyunAktifMi: boolean;
    oyunDurduruldu: boolean;
    gecisEkraninda: boolean;
    mevcutTur: number;
    toplamTur: number;
    kalanZaman: number;
    kalanPasHakki: number;
    skor: { A: number; B: number };
    anlatacakTakim: "A" | "B";
    anlatici: {
        id: string;
        playerId: string;
        ad: string;
        takim: "A" | "B";
    } | null;
    aktifKart: CardData | null;
    altinSkorAktif: boolean;
    creatorId?: string;
    toplamSure?: number;
}

// ─── Socket Events ─────────────────────────────────────────────

export interface TransitionData {
    anlatici: { ad: string; takim: string };
    gozetmen: { ad: string; takim: string } | null;
    kalanSure: number;
    creatorId: string;
}

export interface TurnInfo {
    rol: string;
    isPrimaryGozetmen: boolean;
    kart: CardData | null;
    anlaticiAd: string;
    gozetmenAd: string;
}

export interface GameOverData {
    kazananTakim: "A" | "B" | "Berabere";
    skor: { A: number; B: number };
}

// ─── Category (from DB) ────────────────────────────────────────

export interface CategoryItem {
    id: number;
    name: string;
    color: string | null;
    parent_id: number | null;
    parentId?: number | null;
    is_visible: boolean;
    isVisible?: boolean;
    sortOrder?: number;
    children?: CategoryItem[];
}
