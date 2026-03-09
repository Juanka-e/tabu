import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    couponCodeUpdateSchema,
    toPrismaCouponCodeUpdateData,
} from "@/lib/promotions/promotion-schema";

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
    const couponId = Number(id);
    if (!Number.isInteger(couponId) || couponId <= 0) {
        return NextResponse.json({ error: "Gecersiz kupon id." }, { status: 400 });
    }

    const coupon = await prisma.couponCode.findUnique({
        where: { id: couponId },
    });

    if (!coupon) {
        return NextResponse.json({ error: "Kupon bulunamadi." }, { status: 404 });
    }

    return NextResponse.json(coupon);
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
        const couponId = Number(id);
        if (!Number.isInteger(couponId) || couponId <= 0) {
            return NextResponse.json({ error: "Gecersiz kupon id." }, { status: 400 });
        }

        const body = await request.json();
        const parsed = couponCodeUpdateSchema.parse(body);
        const coupon = await prisma.couponCode.update({
            where: { id: couponId },
            data: toPrismaCouponCodeUpdateData(parsed),
        });

        return NextResponse.json(coupon);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Gecersiz veri.", details: error.issues }, { status: 400 });
        }

        console.error("Failed to update coupon code:", error);
        return NextResponse.json({ error: "Kupon guncellenemedi." }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const { id } = await params;
        const couponId = Number(id);
        if (!Number.isInteger(couponId) || couponId <= 0) {
            return NextResponse.json({ error: "Gecersiz kupon id." }, { status: 400 });
        }

        await prisma.couponCode.update({
            where: { id: couponId },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete coupon code:", error);
        return NextResponse.json({ error: "Kupon silinemedi." }, { status: 500 });
    }
}
