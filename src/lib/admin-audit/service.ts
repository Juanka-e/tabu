import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AdminAuditListQuery } from "@/lib/admin-audit/schema";
import type { AdminAuditListResponse, AdminAuditLogView } from "@/types/admin-audit";

function stringifyMetadataValue(value: Prisma.JsonValue): string {
    if (value === null) {
        return "null";
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map(stringifyMetadataValue).join(", ");
    }

    return "[complex]";
}

export function summarizeAuditMetadata(
    metadata: Prisma.JsonValue | null
): Record<string, string> {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return {};
    }

    const entries = Object.entries(metadata)
        .filter(([key]) => key !== "reason" && key !== "note")
        .slice(0, 8);
    return Object.fromEntries(
        entries.map(([key, value]) => [key, stringifyMetadataValue(value as Prisma.JsonValue)])
    );
}

function extractAuditNote(metadata: Prisma.JsonValue | null): string | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return null;
    }

    const record = metadata as Record<string, Prisma.JsonValue>;
    const candidate = record.reason ?? record.note;
    return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : null;
}

function readMetadataNumber(
    record: Record<string, Prisma.JsonValue>,
    key: string
): number | null {
    const value = record[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readMetadataBoolean(
    record: Record<string, Prisma.JsonValue>,
    key: string
): boolean {
    return record[key] === true;
}

function readMetadataString(
    record: Record<string, Prisma.JsonValue>,
    key: string
): string | null {
    const value = record[key];
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function extractEconomyGuardSummary(
    action: string,
    metadata: Prisma.JsonValue | null
): AdminAuditLogView["economyGuard"] {
    if (
        action !== "game.match.finalize" ||
        !metadata ||
        typeof metadata !== "object" ||
        Array.isArray(metadata)
    ) {
        return null;
    }

    const record = metadata as Record<string, Prisma.JsonValue>;
    return {
        rewardSource: readMetadataString(record, "rewardSource"),
        requestedRewardCoin: readMetadataNumber(record, "requestedRewardCoin"),
        allowedRewardCoin: readMetadataNumber(record, "allowedRewardCoin"),
        blockedRewardCoin: readMetadataNumber(record, "blockedRewardCoin"),
        rewardGuardTriggered: readMetadataBoolean(record, "rewardGuardTriggered"),
        rewardGuardBand: readMetadataString(record, "rewardGuardBand"),
        repeatedGroupTriggered: readMetadataBoolean(record, "repeatedGroupTriggered"),
        repeatedGroupOrdinal: readMetadataNumber(record, "repeatedGroupCurrentOrdinal"),
        repeatedGroupThreshold: readMetadataNumber(record, "repeatedGroupThreshold"),
    };
}

function mapAuditLog(log: {
    id: number;
    action: string;
    resourceType: string;
    resourceId: string | null;
    summary: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    actorRole: string;
    metadata: Prisma.JsonValue | null;
    actor: { id: number; username: string; role: string } | null;
}): AdminAuditLogView {
    return {
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        summary: log.summary,
        note: extractAuditNote(log.metadata),
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString(),
        actor: log.actor
            ? {
                  id: log.actor.id,
                  username: log.actor.username,
                  role: log.actor.role,
              }
            : {
                  id: null,
                  username: null,
                  role: log.actorRole,
              },
        metadata: summarizeAuditMetadata(log.metadata),
        economyGuard: extractEconomyGuardSummary(log.action, log.metadata),
    };
}

export async function getAdminAuditLogs(
    input: AdminAuditListQuery
): Promise<AdminAuditListResponse> {
    const { page, limit, search, action, resourceType, actorRole } = input;

    const where: Prisma.AuditLogWhereInput = {
        ...(search
            ? {
                  OR: [
                      { action: { contains: search } },
                      { resourceType: { contains: search } },
                      { resourceId: { contains: search } },
                      { summary: { contains: search } },
                      {
                          actor: {
                              is: {
                                  username: { contains: search },
                              },
                          },
                      },
                  ],
              }
            : {}),
        ...(action ? { action } : {}),
        ...(resourceType ? { resourceType } : {}),
        ...(actorRole ? { actorRole } : {}),
    };

    const [logs, total, actionGroups, resourceGroups, roleGroups] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                action: true,
                resourceType: true,
                resourceId: true,
                summary: true,
                ipAddress: true,
                userAgent: true,
                createdAt: true,
                actorRole: true,
                metadata: true,
                actor: {
                    select: {
                        id: true,
                        username: true,
                        role: true,
                    },
                },
            },
        }),
        prisma.auditLog.count({ where }),
        prisma.auditLog.groupBy({
            by: ["action"],
            orderBy: { action: "asc" },
        }),
        prisma.auditLog.groupBy({
            by: ["resourceType"],
            orderBy: { resourceType: "asc" },
        }),
        prisma.auditLog.groupBy({
            by: ["actorRole"],
            orderBy: { actorRole: "asc" },
        }),
    ]);

    return {
        logs: logs.map(mapAuditLog),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        actionOptions: actionGroups.map((entry) => entry.action),
        resourceTypeOptions: resourceGroups.map((entry) => entry.resourceType),
        roleOptions: roleGroups.map((entry) => entry.actorRole),
    };
}
