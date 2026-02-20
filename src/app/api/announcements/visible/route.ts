import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        const mapped = announcements.map((a) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            type: a.type,
            created_at: a.createdAt.toISOString(),
            isPinned: a.isPinned,
            version: a.version,
            tags: a.tags,
            mediaUrl: a.mediaUrl,
            mediaType: a.mediaType,
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error("Failed to fetch announcements:", error);
        return NextResponse.json([], { status: 500 });
    }
}
