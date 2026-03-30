import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    couponCodeUpdateSchema,
    toPrismaCouponCodeUpdateData,
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
        await writeAuditLog({
            actor: adminSession,
            action: "admin.coupon.update",
            resourceType: "coupon_code",
            resourceId: coupon.id,
            summary: `Updated coupon ${coupon.code}`,
            metadata: {
                isActive: coupon.isActive,
                usageLimit: coupon.usageLimit,
                usedCount: coupon.usedCount,
            },
            request,
        });

        return NextResponse.json(coupon);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Gecersiz veri.", details: error.issues }, { status: 400 });
        }
        if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
            return NextResponse.json({ error: "Bu kupon kodu zaten kullanılıyor. Farklı bir kod gir." }, { status: 409 });
        }

        console.error("Failed to update coupon code:", error);
        return NextResponse.json({ error: "Kupon guncellenemedi." }, { status: 500 });
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
        const couponId = Number(id);
        if (!Number.isInteger(couponId) || couponId <= 0) {
            return NextResponse.json({ error: "Gecersiz kupon id." }, { status: 400 });
        }

        const coupon = await prisma.couponCode.findUnique({
            where: { id: couponId },
            select: {
                id: true,
                code: true,
                isActive: true,
                usedCount: true,
                _count: {
                    select: {
                        purchases: true,
                    },
                },
            },
        });
        if (!coupon) {
            return NextResponse.json({ error: "Kupon bulunamadı." }, { status: 404 });
        }

        let outcome: "deleted" | "deactivated" = "deactivated";
        if (coupon.isActive) {
            await prisma.couponCode.update({
                where: { id: couponId },
                data: { isActive: false },
            });
        } else {
            if (coupon.usedCount > 0 || coupon._count.purchases > 0) {
                return NextResponse.json(
                    { error: "Kullanılmış kupon kalıcı olarak silinemez. Pasif halde bırakılmalı." },
                    { status: 409 }
                );
            }

            await prisma.couponCode.delete({
                where: { id: couponId },
            });
            outcome = "deleted";
        }
        await writeAuditLog({
            actor: adminSession,
            action: outcome === "deleted" ? "admin.coupon.delete" : "admin.coupon.deactivate",
            resourceType: "coupon_code",
            resourceId: couponId,
            summary: outcome === "deleted" ? `Deleted coupon ${coupon.code}` : `Disabled coupon ${coupon.code}`,
            request,
        });

        return NextResponse.json({ success: true, outcome });
    } catch (error) {
        console.error("Failed to delete coupon code:", error);
        return NextResponse.json({ error: "Kupon silinemedi." }, { status: 500 });
    }
}
