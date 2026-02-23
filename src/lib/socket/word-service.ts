import { prisma } from "@/lib/prisma";

// ─── Types ─────────────────────────────────────────────────────
// Matches the CardData interface in @/types/game.ts

interface CardResult {
    id: number;
    word: string;
    difficulty: 1 | 2 | 3;
    taboo: string[];
    categoryColor: string | null;
}

// ─── Word Pool per Room ────────────────────────────────────────

const wordPools = new Map<string, number[]>();
const POOL_SIZE = parseInt(process.env.WORD_POOL_SIZE || "120", 10);
const primingLocks = new Map<string, Promise<void>>();

// ─── Service Functions ─────────────────────────────────────────

/**
 * Fetch word IDs by categories and difficulties, shuffled.
 * Mirrors the original wordService.js pool logic.
 */
export async function primeWordPool(
    roomCode: string,
    categoryIds: number[],
    difficulties: number[]
): Promise<void> {
    // If already priming, wait for it to finish
    if (primingLocks.has(roomCode)) {
        await primingLocks.get(roomCode);
        return;
    }

    const primePromise = (async () => {
        try {
            const where: Record<string, unknown> = {};

            if (categoryIds.length > 0) {
                where.wordCategories = {
                    some: { categoryId: { in: categoryIds } },
                };
            }

            if (difficulties.length > 0) {
                where.difficulty = { in: difficulties };
            }

            const words = await prisma.word.findMany({
                where,
                select: { id: true },
                take: Math.max(POOL_SIZE * 2, 500),
            });

            // Shuffle (Fisher-Yates)
            const ids = words.map((w) => w.id);
            for (let i = ids.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [ids[i], ids[j]] = [ids[j], ids[i]];
            }

            // Store up to POOL_SIZE
            wordPools.set(roomCode, ids.slice(0, POOL_SIZE));
        } finally {
            primingLocks.delete(roomCode);
        }
    })();

    primingLocks.set(roomCode, primePromise);
    await primePromise;
}

/**
 * Get the next word from the pool, hydrated with taboo words.
 * If pool is depleted, re-prime it.
 * Returns data matching the CardData interface used by the frontend.
 */
export async function getNextWord(
    roomCode: string,
    categoryIds: number[],
    difficulties: number[]
): Promise<CardResult | null> {
    // Rate limiter logic is better placed in the caller (socket), but we can protect cache stampede here
    let pool = wordPools.get(roomCode);

    if (!pool || pool.length === 0) {
        await primeWordPool(roomCode, categoryIds, difficulties);
        pool = wordPools.get(roomCode);
    }

    if (!pool || pool.length === 0) {
        return null;
    }

    const wordId = pool.shift()!;

    // Hydrate the word
    const word = await prisma.word.findUnique({
        where: { id: wordId },
        include: {
            tabooWords: { select: { tabooWordText: true } },
            wordCategories: {
                include: {
                    category: { select: { color: true } },
                },
                take: 1,
            },
        },
    });

    if (!word) return null;

    return {
        id: word.id,
        word: word.wordText,
        difficulty: word.difficulty as 1 | 2 | 3,
        taboo: word.tabooWords.map((tw) => tw.tabooWordText),
        categoryColor: word.wordCategories[0]?.category?.color || null,
    };
}

/**
 * Clear the word pool for a room (on game reset).
 */
export function clearWordPool(roomCode: string): void {
    wordPools.delete(roomCode);
}

/**
 * Get word pool stats for a room.
 */
export function getPoolSize(roomCode: string): number {
    return wordPools.get(roomCode)?.length ?? 0;
}
