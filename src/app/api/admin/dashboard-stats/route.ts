import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRoomMetrics } from "@/lib/socket/room-metrics";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const rateLimit = consumeRequestRateLimit({
        bucket: "admin-dashboard-stats-read",
        key: `admin:${adminSession.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 120,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Cok fazla istatistik istegi. Lutfen biraz bekleyin." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    try {
        const [totalWords, easyCount, mediumCount, hardCount, totalCategories] = await Promise.all([
            prisma.word.count(),
            prisma.word.count({ where: { difficulty: 1 } }),
            prisma.word.count({ where: { difficulty: 2 } }),
            prisma.word.count({ where: { difficulty: 3 } }),
            prisma.category.count(),
        ]);

        let metrics = { aktifLobiSayisi: 0, onlineKullaniciSayisi: 0 };
        try {
            metrics = getRoomMetrics();
        } catch {
            // socket server may not be initialized yet
        }

        return NextResponse.json(
            {
                onlineKullaniciSayisi: metrics.onlineKullaniciSayisi,
                aktifLobiSayisi: metrics.aktifLobiSayisi,
                totalWords,
                totalCategories,
                wordsByDifficulty: {
                    easy: easyCount,
                    medium: mediumCount,
                    hard: hardCount,
                },
            },
            { headers: buildRateLimitHeaders(rateLimit) }
        );
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        return NextResponse.json(
            { error: "Istatistikler yuklenemedi." },
            { status: 500 }
        );
    }
}
