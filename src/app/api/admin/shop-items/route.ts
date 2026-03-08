import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ShopItemType, ItemRarity } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET — List all shop items (admin view, includes inactive)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ShopItemType | null;
    const rarity = searchParams.get("rarity") as ItemRarity | null;
    const activeOnly = searchParams.get("active") === "true";

    const items = await prisma.shopItem.findMany({
        where: {
            ...(type ? { type } : {}),
            ...(rarity ? { rarity } : {}),
            ...(activeOnly ? { isActive: true } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: {
            _count: {
                select: {
                    inventoryItems: true,
                    purchases: true,
                },
            },
        },
    });

    return NextResponse.json(items);
}

// POST — Create a new shop item
const createSchema = z.object({
    code: z.string().min(1).max(80),
    type: z.nativeEnum(ShopItemType),
    name: z.string().min(1).max(120),
    rarity: z.nativeEnum(ItemRarity).default("common"),
    priceCoin: z.number().int().min(0),
    imageUrl: z.string().default(""),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = createSchema.parse(body);

        const item = await prisma.shopItem.create({ data });
        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Geçersiz veri.", details: error.issues },
                { status: 400 }
            );
        }
        console.error("Failed to create shop item:", error);
        return NextResponse.json(
            { error: "Kozmetik oluşturulamadı." },
            { status: 500 }
        );
    }
}
