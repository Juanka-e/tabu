import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidateCategoryCache } from "@/lib/socket/category-service";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// GET - List categories
export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;
    const categories = await prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
            children: { orderBy: { sortOrder: "asc" } },
            _count: { select: { wordCategories: true } },
        },
        where: { parentId: null },
    });

    return NextResponse.json(categories);
}

// POST - Create a category
const createCategorySchema = z.object({
    name: z.string().min(1).max(255),
    parentId: z.number().nullable().optional(),
    color: z.string().max(7).nullable().optional(),
    sortOrder: z.number().optional(),
    isVisible: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;
    try {
        const body = await request.json();
        const data = createCategorySchema.parse(body);

        const category = await prisma.category.create({
            data: {
                name: data.name,
                parentId: data.parentId ?? null,
                color: data.color ?? null,
                sortOrder: data.sortOrder ?? 0,
                isVisible: data.isVisible ?? true,
            },
        });

        invalidateCategoryCache();
        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Geçersiz veri.", details: error.issues },
                { status: 400 }
            );
        }
        console.error("Failed to create category:", error);
        return NextResponse.json(
            { error: "Kategori oluşturulamadı." },
            { status: 500 }
        );
    }
}
