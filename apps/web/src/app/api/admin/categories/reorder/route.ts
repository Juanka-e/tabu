import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { validateAdminCategoryReorderUpdates } from "@/lib/categories/admin-category-reorder";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const rateLimit = consumeRequestRateLimit({
        bucket: "admin-categories-reorder",
        key: `admin:${adminSession.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 20,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Cok fazla kategori siralama denemesi. Lutfen biraz bekleyin." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    try {
        const body = await request.json();
        const updates = Array.isArray(body?.updates) ? body.updates : [];
        const categories = await prisma.category.findMany({
            select: {
                id: true,
                parentId: true,
            },
        });
        const normalizedUpdates = validateAdminCategoryReorderUpdates(updates, categories);

        await prisma.$transaction(
            normalizedUpdates.map((item) =>
                prisma.category.update({
                    where: { id: item.id },
                    data: { sortOrder: item.sortOrder },
                })
            )
        );

        return NextResponse.json(
            { success: true },
            { headers: buildRateLimitHeaders(rateLimit) }
        );
    } catch (error) {
        console.error("Failed to reorder categories:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Siralama guncellenemedi." },
            {
                status: error instanceof Error ? 400 : 500,
                headers: buildRateLimitHeaders(rateLimit),
            }
        );
    }
}
