import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ShopItemType, ItemRarity } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { shopItemWriteSchema, toPrismaShopItemCreateData } from "@/lib/cosmetics/shop-item-schema";
import { writeAuditLog } from "@/lib/security/audit-log";

export const dynamic = "force-dynamic";

// GET — List all shop items (admin view, includes inactive)
export async function GET(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

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
export async function POST(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const body = await request.json();
        const data = toPrismaShopItemCreateData(shopItemWriteSchema.parse(body));

        const item = await prisma.shopItem.create({ data });
        await writeAuditLog({
            actor: adminSession,
            action: "admin.shop-item.create",
            resourceType: "shop_item",
            resourceId: item.id,
            summary: `Created shop item ${item.code}`,
            metadata: {
                code: item.code,
                type: item.type,
                priceCoin: item.priceCoin,
            },
            request,
        });
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
