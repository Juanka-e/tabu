import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const dynamic = "force-dynamic";

// PUT - Update announcement

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Allow partial updates - only include fields that are present
        const data: Record<string, unknown> = {};
        if (body.title !== undefined) data.title = body.title;
        if (body.content !== undefined) data.content = body.content;
        if (body.type !== undefined) data.type = body.type;
        if (body.isVisible !== undefined) data.isVisible = body.isVisible;
        if (body.isPinned !== undefined) data.isPinned = body.isPinned;
        if (body.version !== undefined) data.version = body.version;
        if (body.tags !== undefined) data.tags = body.tags;
        if (body.mediaUrl !== undefined) data.mediaUrl = body.mediaUrl;
        if (body.mediaType !== undefined) data.mediaType = body.mediaType;

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
