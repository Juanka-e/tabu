export type StoreItemType = "avatar" | "frame" | "card_back";
export type StoreItemRarity = "common" | "rare" | "epic" | "legendary";
export type InventoryItemSource = "purchase" | "grant" | "migration";

export interface EquippedSlots {
    avatarItemId: number | null;
    frameItemId: number | null;
    cardBackItemId: number | null;
}

export interface StoreItemView {
    id: number;
    code: string;
    name: string;
    type: StoreItemType;
    rarity: StoreItemRarity;
    priceCoin: number;
    imageUrl: string;
    isActive: boolean;
    sortOrder: number;
    owned: boolean;
    equipped: boolean;
}

export interface InventoryItemView {
    inventoryItemId: number;
    shopItemId: number;
    code: string;
    name: string;
    type: StoreItemType;
    rarity: StoreItemRarity;
    priceCoin: number;
    imageUrl: string;
    source: InventoryItemSource;
    acquiredAt: string;
    equipped: boolean;
}

export interface UserInventoryProfile {
    displayName: string | null;
    bio: string | null;
    avatarItemId: number | null;
    frameItemId: number | null;
    cardBackItemId: number | null;
}

export interface UserInventoryResponse {
    id: number;
    name: string;
    role: string;
    wallet: {
        coinBalance: number;
    };
    profile: UserInventoryProfile;
    items: InventoryItemView[];
}

export interface DashboardMatchView {
    id: number;
    roomCode: string;
    won: boolean;
    scoreA: number;
    scoreB: number;
    coinEarned: number;
    createdAt: string;
}

export interface DashboardDataResponse {
    coinBalance: number;
    totalMatches: number;
    totalWins: number;
    totalCoinEarned: number;
    winRate: number;
    recentMatches: DashboardMatchView[];
}
