export interface AdminAuditActorView {
    id: number | null;
    username: string | null;
    role: string;
}

export interface AdminAuditLogView {
    id: number;
    action: string;
    resourceType: string;
    resourceId: string | null;
    summary: string | null;
    note: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    actor: AdminAuditActorView | null;
    metadata: Record<string, string>;
    economyGuard: {
        rewardSource: string | null;
        requestedRewardCoin: number | null;
        allowedRewardCoin: number | null;
        blockedRewardCoin: number | null;
        rewardGuardTriggered: boolean;
        rewardGuardBand: string | null;
        repeatedGroupTriggered: boolean;
        repeatedGroupOrdinal: number | null;
        repeatedGroupThreshold: number | null;
    } | null;
}

export interface AdminAuditListResponse {
    logs: AdminAuditLogView[];
    total: number;
    page: number;
    pages: number;
    actionOptions: string[];
    resourceTypeOptions: string[];
    roleOptions: string[];
}
