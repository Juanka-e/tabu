import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    shopItemWriteSchema,
    toPrismaItemRarity,
    toPrismaShopItemCreateData,
    toPrismaShopItemType,
} from "@/lib/cosmetics/shop-item-schema";
import { writeAuditLog } from "@/lib/security/audit-log";
import { STORE_ITEM_RARITIES, STORE_ITEM_TYPES } from "@/types/economy";

export const dynamic = "force-dynamic";

const shopItemFilterSchema = z.object({
    type: z.enum(STORE_ITEM_TYPES).optional(),
    rarity: z.enum(STORE_ITEM_RARITIES).optional(),
    active: z.enum(["true", "false"]).optional(),
});

// GET — List all shop items (admin view, includes inactive)
export async function GET(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const { searchParams } = new URL(request.url);
    const parsedFilters = shopItemFilterSchema.safeParse({
        type: searchParams.get("type") || undefined,
        rarity: searchParams.get("rarity") || undefined,
        active: searchParams.get("active") || undefined,
    });

    if (!parsedFilters.success) {
        return NextResponse.json({ error: "Gecersiz filtre." }, { status: 422 });
    }

    const { type, rarity, active } = parsedFilters.data;
    const activeOnly = active === "true";

    const items = await prisma.shopItem.findMany({
        where: {
            ...(type ? { type: toPrismaShopItemType(type) } : {}),
            ...(rarity ? { rarity: toPrismaItemRarity(rarity) } : {}),
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
