import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidateCategoryCache } from "@/lib/socket/category-service";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";

// PUT - Update a category
const updateCategorySchema = z.object({
    name: z.string().min(1).max(255).optional(),
    parentId: z.number().nullable().optional(),
    color: z.string().max(7).nullable().optional(),
    sortOrder: z.number().optional(),
    isVisible: z.boolean().optional(),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const rateLimit = consumeRequestRateLimit({
        bucket: "admin-category-update",
        key: `admin:${adminSession.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 30,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Cok fazla kategori guncelleme denemesi. Lutfen biraz bekleyin." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const data = updateCategorySchema.parse(body);

        const category = await prisma.category.update({
            where: { id: parseInt(id) },
            data,
        });

        invalidateCategoryCache();
        return NextResponse.json(category, { headers: buildRateLimitHeaders(rateLimit) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Geçersiz veri." },
                { status: 400 }
            );
        }
        console.error("Failed to update category:", error);
        return NextResponse.json(
            { error: "Kategori güncellenemedi." },
            { status: 500 }
        );
    }
}

// DELETE - Delete a category
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const rateLimit = consumeRequestRateLimit({
        bucket: "admin-category-delete",
        key: `admin:${adminSession.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 20,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Cok fazla kategori silme denemesi. Lutfen biraz bekleyin." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    try {
        const { id } = await params;
        await prisma.category.delete({ where: { id: parseInt(id) } });
        invalidateCategoryCache();
        return NextResponse.json({ success: true }, { headers: buildRateLimitHeaders(rateLimit) });
    } catch (error) {
        console.error("Failed to delete category:", error);
        return NextResponse.json(
            { error: "Kategori silinemedi." },
            { status: 500 }
        );
    }
}
