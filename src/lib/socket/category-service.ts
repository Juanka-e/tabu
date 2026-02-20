import { prisma } from "@/lib/prisma";
import { cache } from "react";

// ─── Types ─────────────────────────────────────────────────────

interface CategoryWithChildren {
    id: number;
    name: string;
    color: string | null;
    parentId: number | null;
    sortOrder: number;
    children: CategoryWithChildren[];
}

// ─── Cache ─────────────────────────────────────────────────────

let cachedCategories: CategoryWithChildren[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// ─── Service Functions ─────────────────────────────────────────

/**
 * Load visible categories with hierarchy (parent-child).
 * Results are cached for 1 minute with per-request deduplication using React.cache().
 */
export const getVisibleCategories = cache(async function getVisibleCategories(): Promise<CategoryWithChildren[]> {
    const now = Date.now();
    if (cachedCategories && now < cacheExpiry) {
        return cachedCategories;
    }

    const allCategories = await prisma.category.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: {
            id: true,
            name: true,
            color: true,
            parentId: true,
            sortOrder: true,
        },
    });

    // Build tree
    const map = new Map<number, CategoryWithChildren>();
    const roots: CategoryWithChildren[] = [];

    for (const cat of allCategories) {
        map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of allCategories) {
        const node = map.get(cat.id)!;
        if (cat.parentId && map.has(cat.parentId)) {
            map.get(cat.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    }

    cachedCategories = roots;
    cacheExpiry = now + CACHE_TTL_MS;

    return roots;
});

/**
 * Invalidate the category cache (called after admin updates).
 */
export function invalidateCategoryCache(): void {
    cachedCategories = null;
    cacheExpiry = 0;
}
