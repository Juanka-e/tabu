import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    sanitizeAnnouncementContent,
    sanitizeAnnouncementMedia,
    toAnnouncementMediaType,
} from "@/lib/security/announcements";

export const dynamic = "force-dynamic";

// PUT - Update announcement
const updateAnnouncementSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    content: z.string().min(1).optional(),
    type: z.enum(["guncelleme", "duyuru"]).optional(),
    isVisible: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    version: z.string().nullable().optional(),
    tags: z.string().nullable().optional(),
    mediaUrl: z.string().nullable().optional(),
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

        // Allow partial updates - only include fields that are present
        const data: Record<string, unknown> = {};
        if (parsedBody.title !== undefined) data.title = parsedBody.title;
        if (parsedBody.content !== undefined) data.content = sanitizeAnnouncementContent(parsedBody.content);
        if (parsedBody.type !== undefined) data.type = parsedBody.type;
        if (parsedBody.isVisible !== undefined) data.isVisible = parsedBody.isVisible;
        if (parsedBody.isPinned !== undefined) data.isPinned = parsedBody.isPinned;
        if (parsedBody.version !== undefined) data.version = parsedBody.version;
        if (parsedBody.tags !== undefined) data.tags = parsedBody.tags;
        if (parsedBody.mediaUrl !== undefined || parsedBody.mediaType !== undefined) {
            data.mediaUrl = sanitizedMedia.mediaUrl;
            data.mediaType = sanitizedMedia.mediaType;
        }

        const announcement = await prisma.announcement.update({
            where: { id: parseInt(id) },
            data,
        });

        return NextResponse.json(announcement);
    } catch (error) {
        console.error("Failed to update announcement:", error);
        return NextResponse.json(
            { error: "Duyuru güncellenemedi." },
            { status: 500 }
        );
    }
}

// DELETE
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const { id } = await params;
        await prisma.announcement.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete announcement:", error);
        return NextResponse.json(
            { error: "Duyuru silinemedi." },
            { status: 500 }
        );
    }
}
