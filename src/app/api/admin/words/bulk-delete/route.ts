import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";

const bulkDeleteSchema = z.object({
    ids: z.array(z.number().int().positive()).min(1).max(100),
});

export async function POST(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const rateLimit = consumeRequestRateLimit({
        bucket: "admin-words-bulk-delete",
        key: `admin:${adminSession.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 10,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Cok fazla toplu kelime silme denemesi. Lutfen biraz bekleyin." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    try {
        const body = await request.json();
        const { ids } = bulkDeleteSchema.parse(body);

        const result = await prisma.word.deleteMany({
            where: {
                id: { in: Array.from(new Set(ids)) },
            },
        });

        return NextResponse.json(
            { success: true, deletedCount: result.count },
            { headers: buildRateLimitHeaders(rateLimit) }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Gecersiz toplu silme verisi.", details: error.issues },
                { status: 400, headers: buildRateLimitHeaders(rateLimit) }
            );
        }

        console.error("Failed to bulk delete words:", error);
        return NextResponse.json(
            { error: "Kelime kayitlari silinemedi." },
            { status: 500, headers: buildRateLimitHeaders(rateLimit) }
        );
    }
}
