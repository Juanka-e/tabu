import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/security/audit-log";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";
import {
    announcementBlocksSchema,
    announcementBlocksToHtml,
    announcementBlocksToPreview,
    normalizeAnnouncementBlocks,
    toAnnouncementInputJson,
} from "@/lib/announcements/content";
import {
    sanitizeAnnouncementMedia,
    toAnnouncementMediaType,
} from "@/lib/security/announcements";

export const dynamic = "force-dynamic";

const createAnnouncementSchema = z.object({
    title: z.string().trim().min(1).max(255),
    contentBlocks: announcementBlocksSchema,
    type: z.enum(["guncelleme", "duyuru"]).default("guncelleme"),
    isVisible: z.boolean().default(true),
    isPinned: z.boolean().default(false),
    version: z.string().trim().max(50).nullable().optional(),
    tags: z.string().trim().max(500).nullable().optional(),
    mediaUrl: z.string().trim().nullable().optional(),
    mediaType: z.enum(["image", "youtube"]).nullable().optional(),
});

export async function GET(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const rateLimit = consumeRequestRateLimit({
        bucket: "admin-announcements-read",
        key: `${adminSession.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 90,
    });

    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Cok fazla istek gonderildi. Lutfen bekleyin." },
            {
                status: 429,
                headers: buildRateLimitHeaders(rateLimit),
            }
        );
    }

    const announcements = await prisma.announcement.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
        announcements.map((announcement) => {
            const sanitizedMedia = sanitizeAnnouncementMedia(
                announcement.mediaUrl,
                toAnnouncementMediaType(announcement.mediaType)
            );
            const contentBlocks = normalizeAnnouncementBlocks(
                announcement.contentBlocks,
                announcement.content
            );

            return {
                ...announcement,
                contentBlocks,
                contentPreview: announcementBlocksToPreview(contentBlocks),
                mediaUrl: sanitizedMedia.mediaUrl,
                mediaType: sanitizedMedia.mediaType,
            };
        }),
        { headers: buildRateLimitHeaders(rateLimit) }
    );
}

export async function POST(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const body = await request.json();
        const data = createAnnouncementSchema.parse(body);
        const sanitizedMedia = sanitizeAnnouncementMedia(
            data.mediaUrl,
            toAnnouncementMediaType(data.mediaType)
        );
        const htmlContent = announcementBlocksToHtml(data.contentBlocks);

        const announcement = await prisma.announcement.create({
            data: {
                title: data.title,
                content: htmlContent,
                contentBlocks: toAnnouncementInputJson(data.contentBlocks),
                type: data.type,
                isVisible: data.isVisible,
                isPinned: data.isPinned,
                version: data.version || null,
                tags: data.tags || null,
                mediaUrl: sanitizedMedia.mediaUrl,
                mediaType: sanitizedMedia.mediaType,
            },
        });

        await writeAuditLog({
            actor: adminSession,
            action: "admin.announcement.create",
            resourceType: "announcement",
            resourceId: announcement.id,
            summary: `Created announcement ${announcement.title}`,
            metadata: {
                type: announcement.type,
                isVisible: announcement.isVisible,
                isPinned: announcement.isPinned,
            },
            request,
        });

        return NextResponse.json(announcement, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Gecersiz veri.", details: error.issues },
                { status: 400 }
            );
        }

        console.error("Failed to create announcement:", error);
        return NextResponse.json(
            { error: "Duyuru olusturulamadi." },
            { status: 500 }
        );
    }
}
