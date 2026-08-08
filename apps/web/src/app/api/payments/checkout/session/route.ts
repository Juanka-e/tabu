import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
    getActivePaymentOffer,
    getPaymentRuntimeReadiness,
} from "@hushle/platform-payments";
import { enforceAccountCapability } from "@/lib/auth/account-capability";
import {
    getPaymentLegalReadiness,
} from "@/lib/payments/legal";
import {
    buildRateLimitHeaders,
    consumeDistributedRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";
import { getSessionUser } from "@/lib/session";

const checkoutRequestSchema = z.object({
    offerCode: z.string().trim().min(1).max(80),
    idempotencyKey: z.string().trim().min(16).max(128).regex(/^[A-Za-z0-9._:-]+$/),
    legalAcceptance: z.object({
        accepted: z.literal(true),
        checkoutTermsVersion: z.string().trim().min(1).max(80),
        privacyNoticeVersion: z.string().trim().min(1).max(80),
        distanceSalesNoticeVersion: z.string().trim().min(1).max(80),
    }),
});

export async function POST(request: Request) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }
    const capabilityError = enforceAccountCapability(sessionUser, "store_mutation");
    if (capabilityError) return capabilityError;

    const ip = getRequestIp(request);
    const [userLimit, ipLimit] = await Promise.all([
        consumeDistributedRequestRateLimit({
            bucket: "payment-checkout-user",
            key: `user:${sessionUser.id}`,
            windowMs: 5 * 60_000,
            maxRequests: 8,
        }),
        consumeDistributedRequestRateLimit({
            bucket: "payment-checkout-ip",
            key: `ip:${createHash("sha256").update(ip).digest("hex")}`,
            windowMs: 5 * 60_000,
            maxRequests: 100,
        }),
    ]);
    const limit = userLimit.allowed ? ipLimit : userLimit;
    if (!userLimit.allowed || !ipLimit.allowed) {
        return NextResponse.json(
            { error: "Çok fazla ödeme başlatma denemesi yaptın. Biraz bekleyip tekrar dene." },
            { status: 429, headers: buildRateLimitHeaders(limit) }
        );
    }

    let body: z.infer<typeof checkoutRequestSchema>;
    try {
        body = checkoutRequestSchema.parse(await request.json());
    } catch {
        return NextResponse.json({ error: "Geçersiz ödeme isteği." }, { status: 422 });
    }

    const legal = getPaymentLegalReadiness();
    if (!legal.ready) {
        return NextResponse.json(
            { error: "Ödeme altyapısı şu anda kullanıma hazır değil.", code: "CHECKOUT_UNAVAILABLE" },
            { status: 503, headers: { "Retry-After": "60" } }
        );
    }
    if (
        body.legalAcceptance.checkoutTermsVersion !== legal.checkoutTermsVersion ||
        body.legalAcceptance.privacyNoticeVersion !== legal.privacyNoticeVersion ||
        body.legalAcceptance.distanceSalesNoticeVersion !== legal.distanceSalesNoticeVersion
    ) {
        return NextResponse.json(
            { error: "Ödeme metinleri güncellendi. Lütfen metinleri yeniden incele.", code: "LEGAL_VERSION_MISMATCH" },
            { status: 409 }
        );
    }

    const offer = await getActivePaymentOffer(body.offerCode);
    if (!offer) {
        return NextResponse.json({ error: "Ödeme teklifi bulunamadı." }, { status: 404 });
    }

    const runtime = getPaymentRuntimeReadiness();
    if (!runtime.ready) {
        return NextResponse.json(
            { error: "Ödeme altyapısı şu anda kullanıma hazır değil.", code: "CHECKOUT_UNAVAILABLE" },
            { status: 503, headers: { "Retry-After": "60" } }
        );
    }

    // Provider session creation is deliberately enabled only by a concrete adapter branch.
    return NextResponse.json(
        { error: "Ödeme sağlayıcısı henüz kullanıma hazır değil.", code: "PROVIDER_ADAPTER_UNAVAILABLE" },
        { status: 503, headers: { "Retry-After": "60" } }
    );
}
