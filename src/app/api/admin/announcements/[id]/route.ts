import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// Partial Zod schema for announcement updates
const updateAnnouncementSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    content: z.string().min(1).optional(),
    type: z.enum(["guncelleme", "duyuru"]).optional(),
    isVisible: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    version: z.string().nullable().optional(),
    tags: z.string().nullable().optional(),
    mediaUrl: z.string().url().nullable().optional(),
    mediaType: z.enum(["image", "youtube"]).nullable().optional(),
});

// PUT - Update announcement
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error } = await requireAdmin();
    if (error) return error;
    try {
        const { id } = await params;
        const body = await request.json();
        const data = updateAnnouncementSchema.parse(body);

        const announcement = await prisma.announcement.update({
            where: { id: parseInt(id) },
            data,
        });

        return NextResponse.json(announcement);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Geçersiz veri.", details: error.issues },
                { status: 400 }
            );
        }
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
    const { error } = await requireAdmin();
    if (error) return error;
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
