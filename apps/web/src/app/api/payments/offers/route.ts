import { NextResponse } from "next/server";
import {
    getPaymentRuntimeReadiness,
    listActivePaymentOffers,
} from "@hushle/platform-payments";
import { getSessionUser } from "@/lib/session";
import {
    buildRateLimitHeaders,
    consumeDistributedRequestRateLimit,
} from "@/lib/security/request-rate-limit";
import {
    getPaymentLegalReadiness,
    getPublicPaymentLegalDocuments,
} from "@/lib/payments/legal";

export async function GET() {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const rateLimit = await consumeDistributedRequestRateLimit({
        bucket: "payment-offers",
        key: `user:${sessionUser.id}`,
        windowMs: 60_000,
        maxRequests: 30,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Çok sık yenileme yaptın. Biraz bekleyip tekrar dene." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    const [allOffers, runtime, legal] = await Promise.all([
        listActivePaymentOffers(),
        Promise.resolve(getPaymentRuntimeReadiness()),
        Promise.resolve(getPaymentLegalReadiness()),
    ]);
    const offers = allOffers.filter((offer) => offer.productKind !== "coin_pack");

    return NextResponse.json(
        {
            offers,
            checkout: {
                available: runtime.ready && legal.ready,
                unavailableReason: runtime.ready && legal.ready
                    ? null
                    : "Ödeme altyapısı şu anda kullanıma hazır değil.",
                legalDocuments: getPublicPaymentLegalDocuments(legal),
            },
        },
        { headers: { ...buildRateLimitHeaders(rateLimit), "Cache-Control": "private, no-store" } }
    );
}
