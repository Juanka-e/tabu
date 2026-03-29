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
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    actor: AdminAuditActorView | null;
    metadata: Record<string, string>;
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
