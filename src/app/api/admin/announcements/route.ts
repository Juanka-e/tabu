import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    sanitizeAnnouncementContent,
    sanitizeAnnouncementMedia,
    toAnnouncementMediaType,
} from "@/lib/security/announcements";
import { writeAuditLog } from "@/lib/security/audit-log";

export const dynamic = "force-dynamic";

// GET - List announcements
export async function GET() {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
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

            return {
                ...announcement,
                content: sanitizeAnnouncementContent(announcement.content),
                mediaUrl: sanitizedMedia.mediaUrl,
                mediaType: sanitizedMedia.mediaType,
            };
        })
    );
}

// POST - Create announcement
const createAnnouncementSchema = z.object({
    title: z.string().min(1).max(255),
    content: z.string().min(1),
    type: z.enum(["guncelleme", "duyuru"]).default("guncelleme"),
    isVisible: z.boolean().default(true),
    isPinned: z.boolean().default(false),
    version: z.string().nullable().optional(),
    tags: z.string().nullable().optional(),
    mediaUrl: z.string().nullable().optional(),
    mediaType: z.enum(["image", "youtube"]).nullable().optional(),
});

export async function POST(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const body = await request.json();
        const data = createAnnouncementSchema.parse(body);
        const sanitizedMedia = sanitizeAnnouncementMedia(data.mediaUrl, toAnnouncementMediaType(data.mediaType));

        const announcement = await prisma.announcement.create({
            data: {
                title: data.title,
                content: sanitizeAnnouncementContent(data.content),
                type: data.type,
                isVisible: data.isVisible,
                isPinned: data.isPinned,
                version: data.version,
                tags: data.tags,
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
                { error: "Geçersiz veri.", details: error.issues },
                { status: 400 }
            );
        }
        console.error("Failed to create announcement:", error);
        return NextResponse.json(
            { error: "Duyuru oluşturulamadı." },
            { status: 500 }
        );
    }
}
