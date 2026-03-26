import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/security/audit-log";
import {
    announcementBlocksSchema,
    announcementBlocksToHtml,
    toAnnouncementInputJson,
} from "@/lib/announcements/content";
import {
    sanitizeAnnouncementMedia,
    toAnnouncementMediaType,
} from "@/lib/security/announcements";

export const dynamic = "force-dynamic";

const updateAnnouncementSchema = z.object({
    title: z.string().trim().min(1).max(255).optional(),
    contentBlocks: announcementBlocksSchema.optional(),
    type: z.enum(["guncelleme", "duyuru"]).optional(),
    isVisible: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    version: z.string().trim().max(50).nullable().optional(),
    tags: z.string().trim().max(500).nullable().optional(),
    mediaUrl: z.string().trim().nullable().optional(),
    mediaType: z.enum(["image", "youtube"]).nullable().optional(),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const parsedBody = updateAnnouncementSchema.parse(body);
        const sanitizedMedia = sanitizeAnnouncementMedia(
            parsedBody.mediaUrl,
            toAnnouncementMediaType(parsedBody.mediaType)
        );

        const data: Record<string, unknown> = {};

        if (parsedBody.title !== undefined) data.title = parsedBody.title;
        if (parsedBody.type !== undefined) data.type = parsedBody.type;
        if (parsedBody.isVisible !== undefined) data.isVisible = parsedBody.isVisible;
        if (parsedBody.isPinned !== undefined) data.isPinned = parsedBody.isPinned;
        if (parsedBody.version !== undefined) data.version = parsedBody.version || null;
        if (parsedBody.tags !== undefined) data.tags = parsedBody.tags || null;

        if (parsedBody.contentBlocks !== undefined) {
            data.contentBlocks = toAnnouncementInputJson(parsedBody.contentBlocks);
            data.content = announcementBlocksToHtml(parsedBody.contentBlocks);
        }

        if (parsedBody.mediaUrl !== undefined || parsedBody.mediaType !== undefined) {
            data.mediaUrl = sanitizedMedia.mediaUrl;
            data.mediaType = sanitizedMedia.mediaType;
        }

        const announcement = await prisma.announcement.update({
            where: { id: Number.parseInt(id, 10) },
            data,
        });

        await writeAuditLog({
            actor: adminSession,
            action: "admin.announcement.update",
            resourceType: "announcement",
            resourceId: announcement.id,
            summary: `Updated announcement ${announcement.title}`,
            metadata: {
                isVisible: announcement.isVisible,
                isPinned: announcement.isPinned,
            },
            request,
        });

        return NextResponse.json(announcement);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Gecersiz veri.", details: error.issues },
                { status: 400 }
            );
        }

        console.error("Failed to update announcement:", error);
        return NextResponse.json(
            { error: "Duyuru guncellenemedi." },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const { id } = await params;
        const deletedId = Number.parseInt(id, 10);

        await prisma.announcement.delete({ where: { id: deletedId } });

        await writeAuditLog({
            actor: adminSession,
            action: "admin.announcement.delete",
            resourceType: "announcement",
            resourceId: deletedId,
            summary: `Deleted announcement ${deletedId}`,
            request,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete announcement:", error);
        return NextResponse.json(
            { error: "Duyuru silinemedi." },
            { status: 500 }
        );
    }
}
