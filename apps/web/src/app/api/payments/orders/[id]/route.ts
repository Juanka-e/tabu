import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    buildRateLimitHeaders,
    consumeDistributedRequestRateLimit,
} from "@/lib/security/request-rate-limit";
import { getSessionUser } from "@/lib/session";

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    const rateLimit = await consumeDistributedRequestRateLimit({
        bucket: "payment-order-status",
        key: `user:${sessionUser.id}`,
        windowMs: 60_000,
        maxRequests: 30,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Sipariş durumu çok sık sorgulandı." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    const { id } = await context.params;
    const order = await prisma.paymentOrder.findFirst({
        where: { id, userId: sessionUser.id },
        select: {
            id: true,
            status: true,
            productKind: true,
            productNameSnapshot: true,
            quantity: true,
            totalAmountMinor: true,
            currency: true,
            createdAt: true,
            updatedAt: true,
            expiresAt: true,
            paidAt: true,
            fulfilledAt: true,
        },
    });
    if (!order) {
        return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    }

    return NextResponse.json(
        { order },
        { headers: { ...buildRateLimitHeaders(rateLimit), "Cache-Control": "private, no-store" } }
    );
}
