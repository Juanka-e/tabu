import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST - Bulk upload words from CSV
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "Dosya bulunamadı." },
                { status: 400 }
            );
        }

        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length === 0) {
            return NextResponse.json(
                { error: "CSV dosyası boş." },
                { status: 400 }
            );
        }

        // Parse CSV: Expected format: word,difficulty,taboo1,taboo2,...
        // First line may be header — skip if it starts with "word" or "kelime"
        let startIndex = 0;
        const firstLine = lines[0].toLowerCase().trim();
        if (
            firstLine.startsWith("word") ||
            firstLine.startsWith("kelime")
        ) {
            startIndex = 1;
        }

        const results = {
            success: 0,
            skipped: 0,
            errors: [] as string[],
        };

        for (let i = startIndex; i < lines.length; i++) {
            const cols = lines[i].split(",").map((c) => c.trim());
            if (cols.length < 3) {
                results.errors.push(
                    `Satır ${i + 1}: En az 3 sütun gerekli (kelime, zorluk, yasaklı1)`
                );
                continue;
            }

            const wordText = cols[0];
            const difficulty = parseInt(cols[1]);
            const tabooWords = cols.slice(2).filter((t) => t);

            if (!wordText) {
                results.errors.push(`Satır ${i + 1}: Kelime boş.`);
                continue;
            }
            if (isNaN(difficulty) || difficulty < 1 || difficulty > 3) {
                results.errors.push(
                    `Satır ${i + 1}: Zorluk 1-3 arası olmalı.`
                );
                continue;
            }
            if (tabooWords.length === 0) {
                results.errors.push(
                    `Satır ${i + 1}: En az 1 yasaklı kelime gerekli.`
                );
                continue;
            }

            // Check duplicate
            const existing = await prisma.word.findUnique({
                where: { wordText },
            });
            if (existing) {
                results.skipped++;
                continue;
            }

            try {
                await prisma.word.create({
                    data: {
                        wordText,
                        difficulty,
                        tabooWords: {
                            create: tabooWords.map((tw) => ({
                                tabooWordText: tw,
                            })),
                        },
                    },
                });
                results.success++;
            } catch {
                results.errors.push(
                    `Satır ${i + 1}: Veritabanı hatası.`
                );
            }
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error("Bulk upload failed:", error);
        return NextResponse.json(
            { error: "Toplu yükleme başarısız." },
            { status: 500 }
        );
    }
}
