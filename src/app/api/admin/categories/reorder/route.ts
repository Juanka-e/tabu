import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ReorderItem {
    id: number;
    sortOrder: number;
}

export async function POST(request: NextRequest) {
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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to reorder categories:", error);
        return NextResponse.json(
            { error: "Sıralama güncellenemedi." },
            { status: 500 }
        );
    }
}
