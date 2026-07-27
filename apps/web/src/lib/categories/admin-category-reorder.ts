export interface CategoryReorderUpdate {
    id: number;
    sortOrder: number;
}

export interface CategoryReorderMeta {
    id: number;
    parentId: number | null;
}

export function validateAdminCategoryReorderUpdates(
    updates: CategoryReorderUpdate[],
    categories: CategoryReorderMeta[]
): CategoryReorderUpdate[] {
    if (!Array.isArray(updates) || updates.length === 0) {
        throw new Error("Siralama listesi bos olamaz.");
    }

    if (updates.length > 100) {
        throw new Error("Tek seferde cok fazla kategori sirasi guncellenemez.");
    }

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const rootCategoryIds = categories
        .filter((category) => category.parentId === null)
        .map((category) => category.id)
        .sort((left, right) => left - right);
    const seenIds = new Set<number>();

    for (const update of updates) {
        if (!Number.isInteger(update.id) || update.id <= 0) {
            throw new Error("Siralama listesinde gecersiz kategori kimligi var.");
        }

        if (!Number.isInteger(update.sortOrder) || update.sortOrder < 0) {
            throw new Error("Siralama listesinde gecersiz siralama degeri var.");
        }

        if (seenIds.has(update.id)) {
            throw new Error("Ayni kategori siralama listesinde birden fazla kez gonderilemez.");
        }
        seenIds.add(update.id);

        const category = categoryMap.get(update.id);
        if (!category) {
            throw new Error("Siralamaya calisilan kategorilerden biri bulunamadi.");
        }

        if (category.parentId !== null) {
            throw new Error("Alt kategoriler bu akista suruklenemez. Yalnizca ana kategoriler siralanabilir.");
        }
    }

    const sortedSeenIds = Array.from(seenIds).sort((left, right) => left - right);
    if (sortedSeenIds.length !== rootCategoryIds.length) {
        throw new Error("Siralama istegi tum ana kategorileri icermeli.");
    }

    for (let index = 0; index < rootCategoryIds.length; index += 1) {
        if (sortedSeenIds[index] !== rootCategoryIds[index]) {
            throw new Error("Siralama istegi tum ana kategorileri icermeli.");
        }
    }

    return updates
        .map((update) => ({
            id: update.id,
            sortOrder: update.sortOrder,
        }))
        .sort((left, right) => left.sortOrder - right.sortOrder);
}
