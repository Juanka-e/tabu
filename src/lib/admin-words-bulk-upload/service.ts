import { prisma } from "@/lib/prisma";

export type BulkUploadMode = "fixed_categories" | "csv_categories";

export interface BulkUploadResults {
    success: number;
    skipped: number;
    errors: string[];
    skippedRows: string[];
}

interface CategoryRecord {
    id: number;
    name: string;
    parentId: number | null;
}

export function normalizeLabel(value: string): string {
    return value.trim().toLocaleLowerCase("tr-TR");
}

export function parsePositiveInteger(value: string): number | null {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseRow(line: string): string[] {
    return line.split(",").map((column) => column.trim());
}

export async function resolveFixedCategoryIds(
    categoryIdValue: string,
    subcategoryIdValue: string
): Promise<number[] | { error: string }> {
    const selectedCategoryIds = [categoryIdValue, subcategoryIdValue]
        .map(parsePositiveInteger)
        .filter((value): value is number => value !== null);

    const uniqueCategoryIds = Array.from(new Set(selectedCategoryIds));
    if (uniqueCategoryIds.length === 0) {
        return [];
    }

    const categories = await prisma.category.findMany({
        where: { id: { in: uniqueCategoryIds } },
        select: { id: true, parentId: true },
    });

    if (categories.length !== uniqueCategoryIds.length) {
        return { error: "Secilen kategori veya alt kategori bulunamadi." };
    }

    if (subcategoryIdValue) {
        const parentCategoryId = parsePositiveInteger(categoryIdValue);
        const subcategoryId = parsePositiveInteger(subcategoryIdValue);
        const subcategory = categories.find((category) => category.id === subcategoryId);

        if (!subcategory || subcategory.parentId !== parentCategoryId) {
            return { error: "Alt kategori secimi ust kategori ile eslesmiyor." };
        }
    }

    return uniqueCategoryIds;
}

export function buildCategoryIndex(categories: CategoryRecord[]) {
    const byRootName = new Map<string, CategoryRecord>();
    const byParentAndChildName = new Map<string, CategoryRecord>();

    for (const category of categories) {
        if (category.parentId === null) {
            byRootName.set(normalizeLabel(category.name), category);
            continue;
        }

        const parent = categories.find((item) => item.id === category.parentId);
        if (!parent) {
            continue;
        }

        byParentAndChildName.set(
            `${normalizeLabel(parent.name)}::${normalizeLabel(category.name)}`,
            category
        );
    }

    return { byRootName, byParentAndChildName };
}

export function extractCsvCategoryIds(
    rowIndex: number,
    cols: string[],
    categoryIndex: ReturnType<typeof buildCategoryIndex>
): { categoryIds: number[]; tabooOffset: number } | { error: string } {
    const categoryName = cols[2] ?? "";
    const subcategoryName = cols[3] ?? "";

    if (!categoryName) {
        return { error: `Satir ${rowIndex}: CSV modunda kategori zorunlu.` };
    }

    const rootCategory = categoryIndex.byRootName.get(normalizeLabel(categoryName));
    if (!rootCategory) {
        return { error: `Satir ${rowIndex}: "${categoryName}" kategorisi bulunamadi.` };
    }

    if (!subcategoryName) {
        return { categoryIds: [rootCategory.id], tabooOffset: 4 };
    }

    const subcategory = categoryIndex.byParentAndChildName.get(
        `${normalizeLabel(rootCategory.name)}::${normalizeLabel(subcategoryName)}`
    );
    if (!subcategory) {
        return {
            error: `Satir ${rowIndex}: "${subcategoryName}" alt kategorisi "${categoryName}" altinda bulunamadi.`,
        };
    }

    return { categoryIds: [rootCategory.id, subcategory.id], tabooOffset: 4 };
}

export async function processBulkWordUpload(options: {
    text: string;
    mode: BulkUploadMode;
    categoryIdValue?: string;
    subcategoryIdValue?: string;
}) {
    const { text, mode, categoryIdValue = "", subcategoryIdValue = "" } = options;

    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
        return { error: "CSV dosyasi bos." } as const;
    }

    let fixedCategoryIds: number[] = [];
    if (mode === "fixed_categories") {
        const resolved = await resolveFixedCategoryIds(categoryIdValue, subcategoryIdValue);
        if (!Array.isArray(resolved)) {
            return { error: resolved.error } as const;
        }
        fixedCategoryIds = resolved;
    }

    let categoryIndex: ReturnType<typeof buildCategoryIndex> | null = null;
    if (mode === "csv_categories") {
        const categories = await prisma.category.findMany({
            select: { id: true, name: true, parentId: true },
        });
        categoryIndex = buildCategoryIndex(categories);
    }

    let startIndex = 0;
    const firstLine = lines[0].toLocaleLowerCase("tr-TR").trim();
    if (firstLine.startsWith("word") || firstLine.startsWith("kelime")) {
        startIndex = 1;
    }

    const results: BulkUploadResults = {
        success: 0,
        skipped: 0,
        errors: [],
        skippedRows: [],
    };

    for (let i = startIndex; i < lines.length; i++) {
        const rowNumber = i + 1;
        const cols = parseRow(lines[i]);

        const minimumColumns = mode === "csv_categories" ? 5 : 3;
        if (cols.length < minimumColumns) {
            results.errors.push(
                mode === "csv_categories"
                    ? `Satir ${rowNumber}: En az 5 sutun gerekli (kelime, zorluk, kategori, alt_kategori, yasakli1).`
                    : `Satir ${rowNumber}: En az 3 sutun gerekli (kelime, zorluk, yasakli1).`
            );
            continue;
        }

        const wordText = cols[0];
        const difficulty = Number.parseInt(cols[1], 10);

        let categoryIds = fixedCategoryIds;
        let tabooOffset = 2;

        if (mode === "csv_categories") {
            const resolved = extractCsvCategoryIds(rowNumber, cols, categoryIndex!);
            if ("error" in resolved) {
                results.errors.push(resolved.error);
                continue;
            }
            categoryIds = resolved.categoryIds;
            tabooOffset = resolved.tabooOffset;
        }

        const tabooWords = cols.slice(tabooOffset).filter(Boolean);

        if (!wordText) {
            results.errors.push(`Satir ${rowNumber}: Kelime bos.`);
            continue;
        }

        if (Number.isNaN(difficulty) || difficulty < 1 || difficulty > 3) {
            results.errors.push(`Satir ${rowNumber}: Zorluk 1-3 arasinda olmali.`);
            continue;
        }

        if (tabooWords.length === 0) {
            results.errors.push(`Satir ${rowNumber}: En az 1 yasakli kelime gerekli.`);
            continue;
        }

        const existing = await prisma.word.findUnique({
            where: { wordText },
        });
        if (existing) {
            results.skipped += 1;
            results.skippedRows.push(`Satir ${rowNumber}: "${wordText}" zaten mevcut, atlandi.`);
            continue;
        }

        try {
            await prisma.word.create({
                data: {
                    wordText,
                    difficulty,
                    tabooWords: {
                        create: tabooWords.map((tabooWordText) => ({ tabooWordText })),
                    },
                    wordCategories:
                        categoryIds.length > 0
                            ? {
                                create: Array.from(new Set(categoryIds)).map((categoryId) => ({
                                    categoryId,
                                })),
                            }
                            : undefined,
                },
            });
            results.success += 1;
        } catch {
            results.errors.push(`Satir ${rowNumber}: Veritabani hatasi.`);
        }
    }

    return { results, fixedCategoryIds } as const;
}
