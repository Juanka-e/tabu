import { NextRequest, NextResponse } from "next/server";
import { Prisma, prisma } from "@hushle/platform-db";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: z.enum([
        "all", "created", "pending_provider", "awaiting_payment", "paid", "fulfilled",
        "failed", "expired", "refunded", "chargeback",
    ]).default("all"),
    search: z.string().trim().max(191).optional(),
});

export async function GET(request: NextRequest) {
    const admin = await requireAdminSession();
    if (admin instanceof NextResponse) return admin;
    const rateLimit = consumeRequestRateLimit({
        bucket: "admin-payment-read",
        key: `admin:${admin.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 90,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Çok fazla ödeme sorgusu. Lütfen biraz bekleyin." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }
    const parsed = querySchema.safeParse({
        page: request.nextUrl.searchParams.get("page") ?? undefined,
        limit: request.nextUrl.searchParams.get("limit") ?? undefined,
        status: request.nextUrl.searchParams.get("status") ?? undefined,
        search: request.nextUrl.searchParams.get("search") || undefined,
    });
    if (!parsed.success) {
        return NextResponse.json({ error: "Geçersiz ödeme sorgusu." }, { status: 422 });
    }
    const { page, limit, status, search } = parsed.data;
    const where = {
        ...(status === "all" ? {} : { status }),
        ...(search ? {
            OR: [
                { id: { contains: search } },
                { providerOrderReference: { contains: search } },
                { user: { username: { contains: search } } },
            ],
        } : {}),
    } satisfies Prisma.PaymentOrderWhereInput;
    const [total, orders, openCases, deadLetters] = await Promise.all([
        prisma.paymentOrder.count({ where }),
        prisma.paymentOrder.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                user: { select: { id: true, username: true } },
                fulfillment: { select: { status: true, errorCode: true, completedAt: true, reversedAt: true } },
                reversal: { select: { outcome: true, status: true, externalReference: true, reason: true, createdAt: true } },
                reconciliationCase: { select: { status: true, reasonCode: true, attemptCount: true, lastErrorCode: true, lastCheckedAt: true } },
                webhookEvents: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { id: true, status: true, outcome: true, lastErrorCode: true, attemptCount: true },
                },
            },
        }),
        prisma.paymentReconciliationCase.count({ where: { status: "open" } }),
        prisma.paymentWebhookEvent.count({ where: { status: "dead_letter" } }),
    ]);
    return NextResponse.json({
        items: orders.map((order) => ({
            ...order,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
            paidAt: order.paidAt?.toISOString() ?? null,
            fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
            fulfillment: order.fulfillment ? {
                ...order.fulfillment,
                completedAt: order.fulfillment.completedAt?.toISOString() ?? null,
                reversedAt: order.fulfillment.reversedAt?.toISOString() ?? null,
            } : null,
            reversal: order.reversal ? {
                ...order.reversal,
                createdAt: order.reversal.createdAt.toISOString(),
            } : null,
            reconciliationCase: order.reconciliationCase ? {
                ...order.reconciliationCase,
                lastCheckedAt: order.reconciliationCase.lastCheckedAt?.toISOString() ?? null,
            } : null,
        })),
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        total,
        counts: { openCases, deadLetters },
    }, { headers: buildRateLimitHeaders(rateLimit) });
}
