import { NextRequest, NextResponse } from "next/server";
import { reverseExternallyConfirmedPayment, PaymentReversalError } from "@hushle/platform-payments";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { buildRateLimitHeaders, consumeRequestRateLimit, getRequestIp } from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";
const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
    outcome: z.enum(["refund", "chargeback"]),
    externalReference: z.string().trim().min(3).max(191),
    reason: z.string().trim().min(3).max(500),
    confirmationOrderId: z.string().uuid(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const admin = await requireAdminSession();
    if (admin instanceof NextResponse) return admin;
    const params = paramsSchema.safeParse(await context.params);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!params.success || !body.success || body.data.confirmationOrderId !== params.data.id) {
        return NextResponse.json({ error: "Sipariş onayı veya ters işlem verisi geçersiz." }, { status: 422 });
    }
    const rateLimit = consumeRequestRateLimit({
        bucket: "admin-payment-reversal",
        key: `admin:${admin.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 10,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: "Çok fazla ters işlem isteği." }, { status: 429, headers: buildRateLimitHeaders(rateLimit) });
    }
    try {
        const result = await reverseExternallyConfirmedPayment({
            orderId: params.data.id,
            outcome: body.data.outcome,
            externalReference: body.data.externalReference,
            reason: body.data.reason,
            requestedByUserId: admin.id,
        });
        await writeAuditLog({
            actor: admin,
            action: "admin.payment.reversal.apply",
            resourceType: "payment_order",
            resourceId: params.data.id,
            summary: `Applied externally confirmed ${body.data.outcome} to payment order`,
            metadata: {
                outcome: body.data.outcome,
                externalReference: body.data.externalReference,
                reason: body.data.reason,
                reversalStatus: result.status,
                duplicate: result.duplicate,
            },
            request,
        });
        return NextResponse.json(result, { headers: buildRateLimitHeaders(rateLimit) });
    } catch (error) {
        if (error instanceof PaymentReversalError) {
            const status = error.code === "order_not_found" ? 404 : 409;
            return NextResponse.json({ error: error.code }, { status });
        }
        console.error("Payment reversal failed", error);
        return NextResponse.json({ error: "Ters işlem tamamlanamadı." }, { status: 500 });
    }
}
