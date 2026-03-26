import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    bundleUpdateSchema,
    toPrismaBundleUpdateData,
} from "@/lib/promotions/promotion-schema";
import { writeAuditLog } from "@/lib/security/audit-log";

export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const { id } = await params;
    const bundleId = Number(id);
    if (!Number.isInteger(bundleId) || bundleId <= 0) {
        return NextResponse.json({ error: "Gecersiz bundle id." }, { status: 400 });
    }

    const bundle = await prisma.shopBundle.findUnique({
        where: { id: bundleId },
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

    if (!bundle) {
        return NextResponse.json({ error: "Bundle bulunamadi." }, { status: 404 });
    }

    return NextResponse.json(bundle);
}

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
        const bundleId = Number(id);
        if (!Number.isInteger(bundleId) || bundleId <= 0) {
            return NextResponse.json({ error: "Gecersiz bundle id." }, { status: 400 });
        }

        const body = await request.json();
        const parsed = bundleUpdateSchema.parse(body);

        const bundle = await prisma.$transaction(async (tx) => {
            const updatedBundle = await tx.shopBundle.update({
                where: { id: bundleId },
                data: toPrismaBundleUpdateData(parsed),
            });

            if (parsed.items) {
                await tx.shopBundleItem.deleteMany({ where: { bundleId } });
                await tx.shopBundleItem.createMany({
                    data: parsed.items.map((item) => ({
                        bundleId,
                        shopItemId: item.shopItemId,
                        sortOrder: item.sortOrder,
                    })),
                });
            }

            return tx.shopBundle.findUnique({
                where: { id: updatedBundle.id },
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
        });
        if (bundle) {
            await writeAuditLog({
                actor: adminSession,
                action: "admin.bundle.update",
                resourceType: "shop_bundle",
                resourceId: bundle.id,
                summary: `Updated bundle ${bundle.code}`,
                metadata: {
                    isActive: bundle.isActive,
                    priceCoin: bundle.priceCoin,
                    itemCount: bundle.items.length,
                },
                request,
            });
        }

        return NextResponse.json(bundle);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Gecersiz veri.", details: error.issues }, { status: 400 });
        }

        console.error("Failed to update shop bundle:", error);
        return NextResponse.json({ error: "Bundle guncellenemedi." }, { status: 500 });
    }
}

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
        const bundleId = Number(id);
        if (!Number.isInteger(bundleId) || bundleId <= 0) {
            return NextResponse.json({ error: "Gecersiz bundle id." }, { status: 400 });
        }

        await prisma.shopBundle.update({
            where: { id: bundleId },
            data: { isActive: false },
        });
        await writeAuditLog({
            actor: adminSession,
            action: "admin.bundle.delete",
            resourceType: "shop_bundle",
            resourceId: bundleId,
            summary: `Disabled bundle ${bundleId}`,
            request,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete shop bundle:", error);
        return NextResponse.json({ error: "Bundle silinemedi." }, { status: 500 });
    }
}
