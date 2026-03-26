import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    discountCampaignUpdateSchema,
    toPrismaDiscountCampaignUpdateData,
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
    const discountId = Number(id);
    if (!Number.isInteger(discountId) || discountId <= 0) {
        return NextResponse.json({ error: "Gecersiz indirim id." }, { status: 400 });
    }

    const discount = await prisma.discountCampaign.findUnique({
        where: { id: discountId },
    });

    if (!discount) {
        return NextResponse.json({ error: "Indirim bulunamadi." }, { status: 404 });
    }

    return NextResponse.json({
        ...discount,
        startsAt: discount.startsAt?.toISOString() ?? null,
        endsAt: discount.endsAt?.toISOString() ?? null,
        createdAt: discount.createdAt.toISOString(),
    });
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
        const discountId = Number(id);
        if (!Number.isInteger(discountId) || discountId <= 0) {
            return NextResponse.json({ error: "Gecersiz indirim id." }, { status: 400 });
        }

        const body = await request.json();
        const parsed = discountCampaignUpdateSchema.parse(body);
        const discount = await prisma.discountCampaign.update({
            where: { id: discountId },
            data: toPrismaDiscountCampaignUpdateData(parsed),
        });
        await writeAuditLog({
            actor: adminSession,
            action: "admin.discount.update",
            resourceType: "discount_campaign",
            resourceId: discount.id,
            summary: `Updated discount ${discount.code}`,
            metadata: {
                isActive: discount.isActive,
                usageLimit: discount.usageLimit,
                usedCount: discount.usedCount,
            },
            request,
        });

        return NextResponse.json({
            ...discount,
            startsAt: discount.startsAt?.toISOString() ?? null,
            endsAt: discount.endsAt?.toISOString() ?? null,
            createdAt: discount.createdAt.toISOString(),
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Gecersiz veri.", details: error.issues }, { status: 400 });
        }

        console.error("Failed to update discount campaign:", error);
        return NextResponse.json({ error: "Indirim kampanyasi guncellenemedi." }, { status: 500 });
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
        const discountId = Number(id);
        if (!Number.isInteger(discountId) || discountId <= 0) {
            return NextResponse.json({ error: "Gecersiz indirim id." }, { status: 400 });
        }

        await prisma.discountCampaign.update({
            where: { id: discountId },
            data: { isActive: false },
        });
        await writeAuditLog({
            actor: adminSession,
            action: "admin.discount.delete",
            resourceType: "discount_campaign",
            resourceId: discountId,
            summary: `Disabled discount ${discountId}`,
            request,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete discount campaign:", error);
        return NextResponse.json({ error: "Indirim kampanyasi silinemedi." }, { status: 500 });
    }
}
