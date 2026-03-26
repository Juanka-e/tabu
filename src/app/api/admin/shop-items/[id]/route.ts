import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { shopItemUpdateSchema, toPrismaShopItemUpdateData } from "@/lib/cosmetics/shop-item-schema";
import { writeAuditLog } from "@/lib/security/audit-log";

export const dynamic = "force-dynamic";

// GET — Get single shop item
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

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
        const data = toPrismaShopItemUpdateData(shopItemUpdateSchema.parse(body));

        const item = await prisma.shopItem.update({
            where: { id: parseInt(id) },
            data,
        });
        await writeAuditLog({
            actor: adminSession,
            action: "admin.shop-item.update",
            resourceType: "shop_item",
            resourceId: item.id,
            summary: `Updated shop item ${item.code}`,
            metadata: {
                code: item.code,
                isActive: item.isActive,
                priceCoin: item.priceCoin,
            },
            request,
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
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const { id } = await params;
        const itemId = parseInt(id);
        await prisma.shopItem.update({
            where: { id: itemId },
            data: { isActive: false },
        });
        await writeAuditLog({
            actor: adminSession,
            action: "admin.shop-item.delete",
            resourceType: "shop_item",
            resourceId: itemId,
            summary: `Soft deleted shop item ${itemId}`,
            request,
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
