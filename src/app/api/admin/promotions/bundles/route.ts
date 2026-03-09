import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    bundleWriteSchema,
    toPrismaBundleCreateData,
} from "@/lib/promotions/promotion-schema";
import { writeAuditLog } from "@/lib/security/audit-log";

export const dynamic = "force-dynamic";

export async function GET() {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const bundles = await prisma.shopBundle.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: {
            items: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                include: {
                    shopItem: {
                        select: {
                            code: true,
                            name: true,
                            type: true,
                            rarity: true,
                        },
                    },
                },
            },
        },
    });

    return NextResponse.json(
        bundles.map((bundle) => ({
            id: bundle.id,
            code: bundle.code,
            name: bundle.name,
            description: bundle.description,
            priceCoin: bundle.priceCoin,
            isActive: bundle.isActive,
            sortOrder: bundle.sortOrder,
            createdAt: bundle.createdAt.toISOString(),
            items: bundle.items.map((item) => ({
                id: item.id,
                shopItemId: item.shopItemId,
                sortOrder: item.sortOrder,
                itemCode: item.shopItem.code,
                itemName: item.shopItem.name,
                itemType: item.shopItem.type,
                itemRarity: item.shopItem.rarity,
            })),
        }))
    );
}

export async function POST(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const body = await request.json();
        const parsed = bundleWriteSchema.parse(body);
        const bundle = await prisma.shopBundle.create({
            data: toPrismaBundleCreateData(parsed),
            include: {
                items: {
                    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                    include: {
                        shopItem: {
                            select: {
                                code: true,
                                name: true,
                                type: true,
                                rarity: true,
                            },
                        },
                    },
                },
            },
        });
        await writeAuditLog({
            actor: adminSession,
            action: "admin.bundle.create",
            resourceType: "shop_bundle",
            resourceId: bundle.id,
            summary: `Created bundle ${bundle.code}`,
            metadata: {
                code: bundle.code,
                priceCoin: bundle.priceCoin,
                itemCount: bundle.items.length,
            },
            request,
        });

        return NextResponse.json(bundle, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Gecersiz veri.", details: error.issues }, { status: 400 });
        }

        console.error("Failed to create shop bundle:", error);
        return NextResponse.json({ error: "Bundle olusturulamadi." }, { status: 500 });
    }
}
