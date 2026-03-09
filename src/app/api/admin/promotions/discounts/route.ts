import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    discountCampaignWriteSchema,
    toPrismaDiscountCampaignCreateData,
} from "@/lib/promotions/promotion-schema";

export const dynamic = "force-dynamic";

export async function GET() {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const discounts = await prisma.discountCampaign.findMany({
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
        discounts.map((discount) => ({
            ...discount,
            startsAt: discount.startsAt?.toISOString() ?? null,
            endsAt: discount.endsAt?.toISOString() ?? null,
            createdAt: discount.createdAt.toISOString(),
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
        const parsed = discountCampaignWriteSchema.parse(body);
        const discount = await prisma.discountCampaign.create({
            data: toPrismaDiscountCampaignCreateData(parsed),
        });

        return NextResponse.json({
            ...discount,
            startsAt: discount.startsAt?.toISOString() ?? null,
            endsAt: discount.endsAt?.toISOString() ?? null,
            createdAt: discount.createdAt.toISOString(),
        }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Gecersiz veri.", details: error.issues }, { status: 400 });
        }

        console.error("Failed to create discount campaign:", error);
        return NextResponse.json({ error: "Indirim kampanyasi olusturulamadi." }, { status: 500 });
    }
}
