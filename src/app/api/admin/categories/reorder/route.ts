import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";

interface ReorderItem {
    id: number;
    sortOrder: number;
}

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
        const { updates }: { updates: ReorderItem[] } = body;

        // Update all categories in a transaction
        await prisma.$transaction(
            updates.map((item) =>
                prisma.category.update({
                    where: { id: item.id },
                    data: { sortOrder: item.sortOrder },
                })
            )
        );

        return NextResponse.json({ success: true }, { headers: buildRateLimitHeaders(rateLimit) });
    } catch (error) {
        console.error("Failed to reorder categories:", error);
        return NextResponse.json(
            { error: "Sıralama güncellenemedi." },
            { status: 500 }
        );
    }
}
