import { prisma } from "@/lib/prisma";

type AuditMetadataValue = string | number | boolean | null;
type AuditMetadata = Record<string, AuditMetadataValue | AuditMetadataValue[]>;
type AuditMetadataEntry = [string, AuditMetadataValue | AuditMetadataValue[]];

export interface AuditActor {
    id: number | null;
    role: string;
}

export interface AuditLogInput {
    actor: AuditActor;
    action: string;
    resourceType: string;
    resourceId?: string | number | null;
    summary?: string | null;
    metadata?: AuditMetadata | null;
    request?: Request | null;
}

function normalizeMetadata(
    metadata: AuditMetadata | null | undefined
): AuditMetadata | null {
    if (!metadata) {
        return null;
    }

    const entries: AuditMetadataEntry[] = [];

    for (const [key, value] of Object.entries(metadata)) {
        if (
            value === null ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            entries.push([key, value]);
            continue;
        }

        if (Array.isArray(value)) {
            const normalizedArray = value.filter(
                (entry): entry is AuditMetadataValue =>
                    entry === null ||
                    typeof entry === "string" ||
                    typeof entry === "number" ||
                    typeof entry === "boolean"
            );
            entries.push([key, normalizedArray]);
        }
    }

    return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function getRequestIp(request: Request | null | undefined): string | null {
    if (!request) {
        return null;
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    return request.headers.get("x-real-ip");
}

function getUserAgent(request: Request | null | undefined): string | null {
    if (!request) {
        return null;
    }

    const userAgent = request.headers.get("user-agent");
    if (!userAgent) {
        return null;
    }

    return userAgent.slice(0, 255);
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
    const { actor, action, resourceType, resourceId, summary, metadata, request } = input;
    const normalizedMetadata = normalizeMetadata(metadata);

    await prisma.auditLog.create({
        data: {
            actorUserId: actor.id,
            actorRole: actor.role.slice(0, 20),
            action: action.slice(0, 80),
            resourceType: resourceType.slice(0, 80),
            resourceId: resourceId !== undefined && resourceId !== null ? String(resourceId).slice(0, 120) : null,
            ipAddress: getRequestIp(request)?.slice(0, 64) ?? null,
            userAgent: getUserAgent(request),
            summary: summary?.slice(0, 255) ?? null,
            metadata: normalizedMetadata ?? undefined,
        },
    });
}
