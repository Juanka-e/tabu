import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    couponCodeWriteSchema,
    toPrismaCouponCodeCreateData,
} from "@/lib/promotions/promotion-schema";
import { writeAuditLog } from "@/lib/security/audit-log";

export const dynamic = "force-dynamic";

export async function GET() {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const coupons = await prisma.couponCode.findMany({
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
        coupons.map((coupon) => ({
            ...coupon,
            startsAt: coupon.startsAt?.toISOString() ?? null,
            endsAt: coupon.endsAt?.toISOString() ?? null,
            createdAt: coupon.createdAt.toISOString(),
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
        const parsed = couponCodeWriteSchema.parse(body);
        const coupon = await prisma.couponCode.create({
            data: toPrismaCouponCodeCreateData(parsed),
        });
        await writeAuditLog({
            actor: adminSession,
            action: "admin.coupon.create",
            resourceType: "coupon_code",
            resourceId: coupon.id,
            summary: `Created coupon ${coupon.code}`,
            metadata: {
                code: coupon.code,
                targetType: coupon.targetType,
                usageLimit: coupon.usageLimit,
            },
            request,
        });

        return NextResponse.json(coupon, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Gecersiz veri.", details: error.issues }, { status: 400 });
        }

        console.error("Failed to create coupon code:", error);
        return NextResponse.json({ error: "Kupon olusturulamadi." }, { status: 500 });
    }
}
