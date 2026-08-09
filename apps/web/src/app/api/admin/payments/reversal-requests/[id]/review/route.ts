import { NextRequest, NextResponse } from "next/server";
import {
    approvePaymentReversalRequest,
    PaymentReversalError,
    rejectPaymentReversalRequest,
} from "@hushle/platform-payments";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/security/audit-log";
import { buildRateLimitHeaders, consumeRequestRateLimit, getRequestIp } from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";
const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
    action: z.enum(["approve", "reject"]),
    reviewNote: z.string().trim().min(3).max(500),
    confirmationRequestId: z.string().uuid(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const admin = await requireAdminSession();
    if (admin instanceof NextResponse) return admin;
    const params = paramsSchema.safeParse(await context.params);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!params.success || !body.success || body.data.confirmationRequestId !== params.data.id) {
        return NextResponse.json({ error: "Talep onayı geçersiz." }, { status: 422 });
    }
    const rateLimit = consumeRequestRateLimit({
        bucket: "admin-payment-reversal-review",
        key: `admin:${admin.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 10,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: "Çok fazla reversal inceleme isteği." }, { status: 429, headers: buildRateLimitHeaders(rateLimit) });
    }
    try {
        const result = body.data.action === "approve"
            ? await approvePaymentReversalRequest({
                requestId: params.data.id,
                reviewedByUserId: admin.id,
                reviewNote: body.data.reviewNote,
            })
            : await rejectPaymentReversalRequest({
                requestId: params.data.id,
                reviewedByUserId: admin.id,
                reviewNote: body.data.reviewNote,
            });
        await writeAuditLog({
            actor: admin,
            action: `admin.payment.reversal.${body.data.action}`,
            resourceType: "payment_reversal_request",
            resourceId: params.data.id,
            summary: `${body.data.action} payment reversal request`,
            metadata: { reviewNote: body.data.reviewNote },
            request,
        });
        return NextResponse.json({ ok: true, result }, { headers: buildRateLimitHeaders(rateLimit) });
    } catch (error) {
        if (error instanceof PaymentReversalError) {
            const status = error.code === "request_not_found" ? 404 : 409;
            return NextResponse.json({ error: error.code }, { status });
        }
        console.error("Payment reversal review failed", error);
        return NextResponse.json({ error: "Reversal incelemesi tamamlanamadı." }, { status: 500 });
    }
}
