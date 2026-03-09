export type StoreItemType = "avatar" | "frame" | "card_back" | "card_face";
export type StoreItemRarity = "common" | "rare" | "epic" | "legendary";
export type InventoryItemSource = "purchase" | "grant" | "migration";
export type StoreItemRenderMode = "image" | "template";
export type TemplateConfigValue = string | number | boolean;
export type TemplateConfig = Record<string, TemplateConfigValue>;

export interface EquippedSlots {
    avatarItemId: number | null;
    frameItemId: number | null;
    cardBackItemId: number | null;
    cardFaceItemId: number | null;
}

export interface StoreItemView {
    id: number;
    code: string;
    name: string;
    type: StoreItemType;
    rarity: StoreItemRarity;
    renderMode: StoreItemRenderMode;
    priceCoin: number;
    imageUrl: string;
    templateKey: string | null;
    templateConfig: TemplateConfig | null;
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
    renderMode: StoreItemRenderMode;
    priceCoin: number;
    imageUrl: string;
    templateKey: string | null;
    templateConfig: TemplateConfig | null;
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
    cardFaceItemId: number | null;
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

export interface PlayerAppearanceSnapshot {
    avatarImageUrl: string | null;
    frameImageUrl: string | null;
    frameAccentColor: string | null;
}
