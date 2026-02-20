import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { invalidateCategoryCache } from "@/lib/socket/category-service";

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
    try {
        const { id } = await params;
        const body = await request.json();
        const data = updateCategorySchema.parse(body);

        const category = await prisma.category.update({
            where: { id: parseInt(id) },
            data,
        });

        invalidateCategoryCache();
        return NextResponse.json(category);
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
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.category.delete({ where: { id: parseInt(id) } });
        invalidateCategoryCache();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete category:", error);
        return NextResponse.json(
            { error: "Kategori silinemedi." },
            { status: 500 }
        );
    }
}
