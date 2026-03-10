import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    sanitizeAnnouncementContent,
    sanitizeAnnouncementMedia,
    toAnnouncementMediaType,
} from "@/lib/security/announcements";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const announcements = await prisma.announcement.findMany({
            where: { isVisible: true },
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
            select: {
                id: true,
                title: true,
                content: true,
                type: true,
                createdAt: true,
                isPinned: true,
                version: true,
                tags: true,
                mediaUrl: true,
                mediaType: true,
            },
        });

        // Map to snake_case for frontend compatibility
        const mapped = announcements.map((announcement) => {
            const sanitizedMedia = sanitizeAnnouncementMedia(
                announcement.mediaUrl,
                toAnnouncementMediaType(announcement.mediaType)
            );

            return {
                id: announcement.id,
                title: announcement.title,
                content: sanitizeAnnouncementContent(announcement.content),
                type: announcement.type,
                created_at: announcement.createdAt.toISOString(),
                isPinned: announcement.isPinned,
                version: announcement.version,
                tags: announcement.tags,
                mediaUrl: sanitizedMedia.mediaUrl,
                mediaType: sanitizedMedia.mediaType,
            };
        });

        return NextResponse.json(mapped);
    } catch (error) {
        console.error("Failed to fetch announcements:", error);
        return NextResponse.json([], { status: 500 });
    }
}
