import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";
import {
    announcementBlocksToPreview,
    normalizeAnnouncementBlocks,
} from "@/lib/announcements/content";
import {
    sanitizeAnnouncementMedia,
    toAnnouncementMediaType,
} from "@/lib/security/announcements";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const rateLimit = consumeRequestRateLimit({
        bucket: "announcements-visible-read",
        key: getRequestIp(request),
        windowMs: 60_000,
        maxRequests: 50,
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

    try {
        const announcements = await prisma.announcement.findMany({
            where: { isVisible: true },
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
            select: {
                id: true,
                title: true,
                content: true,
                contentBlocks: true,
                type: true,
                createdAt: true,
                isPinned: true,
                version: true,
                tags: true,
                mediaUrl: true,
                mediaType: true,
            },
        });

        const mapped = announcements.map((announcement) => {
            const sanitizedMedia = sanitizeAnnouncementMedia(
                announcement.mediaUrl,
                toAnnouncementMediaType(announcement.mediaType)
            );
            const contentBlocks = normalizeAnnouncementBlocks(
                announcement.contentBlocks,
                announcement.content
            );

            return {
                id: announcement.id,
                title: announcement.title,
                contentBlocks,
                preview: announcementBlocksToPreview(contentBlocks),
                type: announcement.type,
                created_at: announcement.createdAt.toISOString(),
                isPinned: announcement.isPinned,
                version: announcement.version,
                tags: announcement.tags,
                mediaUrl: sanitizedMedia.mediaUrl,
                mediaType: sanitizedMedia.mediaType,
            };
        });

        return NextResponse.json(mapped, {
            headers: buildRateLimitHeaders(rateLimit),
        });
    } catch (error) {
        console.error("Failed to fetch announcements:", error);
        return NextResponse.json([], { status: 500 });
    }
}
