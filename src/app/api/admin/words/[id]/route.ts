import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET - Get a single word
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const word = await prisma.word.findUnique({
        where: { id: parseInt(id) },
        include: {
            tabooWords: true,
            wordCategories: { include: { category: true } },
        },
    });

    if (!word) {
        return NextResponse.json({ error: "Kelime bulunamadı." }, { status: 404 });
    }

    return NextResponse.json(word);
}

// PUT - Update a word
const updateWordSchema = z.object({
    wordText: z.string().min(1).max(255).optional(),
    difficulty: z.number().min(1).max(3).optional(),
    tabooWords: z.array(z.string().min(1).max(255)).optional(),
    categoryIds: z.array(z.number()).optional(),
});

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const wordId = parseInt(id);
        const body = await request.json();
        const data = updateWordSchema.parse(body);

        // Update word and related data in a transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const word = await prisma.$transaction(async (tx: any) => {
            // Update main word data
            const updated = await tx.word.update({
                where: { id: wordId },
                data: {
                    wordText: data.wordText,
                    difficulty: data.difficulty,
                },
            });

            // Update taboo words if provided
            if (data.tabooWords) {
                await tx.tabooWord.deleteMany({ where: { wordId } });
                await tx.tabooWord.createMany({
                    data: data.tabooWords.map((tw) => ({
                        wordId,
                        tabooWordText: tw,
                    })),
                });
            }

            // Update categories if provided
            if (data.categoryIds) {
                await tx.wordCategory.deleteMany({ where: { wordId } });
                await tx.wordCategory.createMany({
                    data: data.categoryIds.map((catId) => ({
                        wordId,
                        categoryId: catId,
                    })),
                });
            }

            return tx.word.findUnique({
                where: { id: wordId },
                include: {
                    tabooWords: true,
                    wordCategories: { include: { category: true } },
                },
            });
        });

        return NextResponse.json(word);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Geçersiz veri.", details: error.issues },
                { status: 400 }
            );
        }
        console.error("Failed to update word:", error);
        return NextResponse.json(
            { error: "Kelime güncellenemedi." },
            { status: 500 }
        );
    }
}

// DELETE - Delete a word
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.word.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete word:", error);
        return NextResponse.json(
            { error: "Kelime silinemedi." },
            { status: 500 }
        );
    }
}
