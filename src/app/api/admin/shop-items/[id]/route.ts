import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ShopItemType, ItemRarity } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET — Get single shop item
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const item = await prisma.shopItem.findUnique({
        where: { id: parseInt(id) },
        include: {
            _count: {
                select: {
                    inventoryItems: true,
                    purchases: true,
                },
            },
        },
    });

    if (!item) {
        return NextResponse.json({ error: "Kozmetik bulunamadı." }, { status: 404 });
    }

    return NextResponse.json(item);
}

// PUT — Update shop item
const updateSchema = z.object({
    code: z.string().min(1).max(80).optional(),
    type: z.nativeEnum(ShopItemType).optional(),
    name: z.string().min(1).max(120).optional(),
    rarity: z.nativeEnum(ItemRarity).optional(),
    priceCoin: z.number().int().min(0).optional(),
    imageUrl: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const data = updateSchema.parse(body);

        const item = await prisma.shopItem.update({
            where: { id: parseInt(id) },
            data,
        });

        return NextResponse.json(item);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Geçersiz veri.", details: error.issues },
                { status: 400 }
            );
        }
        console.error("Failed to update shop item:", error);
        return NextResponse.json(
            { error: "Kozmetik güncellenemedi." },
            { status: 500 }
        );
    }
}

// DELETE — Soft delete (set isActive=false)
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.shopItem.update({
            where: { id: parseInt(id) },
            data: { isActive: false },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete shop item:", error);
        return NextResponse.json(
            { error: "Kozmetik silinemedi." },
            { status: 500 }
        );
    }
}
