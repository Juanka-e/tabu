import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRoomMetrics } from "@/lib/socket/room-metrics";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;
    try {
        // Word counts by difficulty
        const [totalWords, easyCount, mediumCount, hardCount, totalCategories] =
            await Promise.all([
                prisma.word.count(),
                prisma.word.count({ where: { difficulty: 1 } }),
                prisma.word.count({ where: { difficulty: 2 } }),
                prisma.word.count({ where: { difficulty: 3 } }),
                prisma.category.count(),
            ]);

        // Room metrics (from in-memory game state)
        let metrics = { aktifLobiSayisi: 0, onlineKullaniciSayisi: 0 };
        try {
            metrics = getRoomMetrics();
        } catch {
            // Server may not have socket initialized yet
        }

        return NextResponse.json({
            onlineKullaniciSayisi: metrics.onlineKullaniciSayisi,
            aktifLobiSayisi: metrics.aktifLobiSayisi,
            totalWords,
            totalCategories,
            wordsByDifficulty: {
                easy: easyCount,
                medium: mediumCount,
                hard: hardCount,
            },
        });
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        return NextResponse.json(
            { error: "İstatistikler yüklenemedi." },
            { status: 500 }
        );
    }
}
