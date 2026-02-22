import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// GET - List words with search & pagination
export async function GET(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const difficulty = searchParams.get("difficulty");
    const categoryId = searchParams.get("categoryId");

    const where: Record<string, unknown> = {};

    if (search) {
        where.wordText = { contains: search };
    }
    if (difficulty) {
        where.difficulty = parseInt(difficulty);
    }
    if (categoryId) {
        where.wordCategories = {
            some: { categoryId: parseInt(categoryId) },
        };
    }

    const [words, total] = await Promise.all([
        prisma.word.findMany({
            where,
            include: {
                tabooWords: { select: { id: true, tabooWordText: true } },
                wordCategories: {
                    include: { category: { select: { id: true, name: true, color: true } } },
                },
            },
            orderBy: { id: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.word.count({ where }),
    ]);

    return NextResponse.json({
        words,
        total,
        page,
        pages: Math.ceil(total / limit),
    });
}

// POST - Create a new word
const createWordSchema = z.object({
    wordText: z.string().min(1).max(255),
    difficulty: z.number().min(1).max(3),
    tabooWords: z.array(z.string().min(1).max(255)).min(1).max(10),
    categoryIds: z.array(z.number()).optional(),
});

export async function POST(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;
    try {
        const body = await request.json();
        const data = createWordSchema.parse(body);

        // Check for duplicate
        const existing = await prisma.word.findUnique({
            where: { wordText: data.wordText },
        });
        if (existing) {
            return NextResponse.json(
                { error: "Bu kelime zaten mevcut." },
                { status: 409 }
            );
        }

        const word = await prisma.word.create({
            data: {
                wordText: data.wordText,
                difficulty: data.difficulty,
                tabooWords: {
                    create: data.tabooWords.map((tw) => ({ tabooWordText: tw })),
                },
                wordCategories: data.categoryIds
                    ? {
                        create: data.categoryIds.map((catId) => ({
                            categoryId: catId,
                        })),
                    }
                    : undefined,
            },
            include: {
                tabooWords: true,
                wordCategories: { include: { category: true } },
            },
        });

        return NextResponse.json(word, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Geçersiz veri.", details: error.issues },
                { status: 400 }
            );
        }
        console.error("Failed to create word:", error);
        return NextResponse.json(
            { error: "Kelime oluşturulamadı." },
            { status: 500 }
        );
    }
}
