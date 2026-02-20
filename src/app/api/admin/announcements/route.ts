import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET - List announcements
export async function GET() {
    const announcements = await prisma.announcement.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(announcements);
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
    try {
        const body = await request.json();
        const data = createAnnouncementSchema.parse(body);

        const announcement = await prisma.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                type: data.type,
                isVisible: data.isVisible,
                isPinned: data.isPinned,
                version: data.version,
                tags: data.tags,
                mediaUrl: data.mediaUrl,
                mediaType: data.mediaType,
            },
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
