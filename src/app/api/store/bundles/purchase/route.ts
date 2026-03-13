import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { purchaseStoreBundle } from "@/lib/economy";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";
import { writeAuditLog } from "@/lib/security/audit-log";
import { getSystemSettings } from "@/lib/system-settings/service";
import {
    getFeatureDisabledMessage,
    isStoreAvailable,
} from "@/lib/system-settings/policies";

const purchaseBundleSchema = z.object({
    bundleId: z.number().int().positive(),
    couponCode: z.string().trim().min(1).max(80).optional(),
});

export async function POST(req: Request) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const settings = await getSystemSettings();
    if (!isStoreAvailable(settings)) {
        return NextResponse.json(
            { error: getFeatureDisabledMessage("store") },
            { status: 409 }
        );
    }

    try {
        const rateLimit = consumeRequestRateLimit({
            bucket: "store-bundle-purchase",
            key: `user:${sessionUser.id}:${getRequestIp(req)}`,
            windowMs: 5 * 60_000,
            maxRequests: 20,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Cok fazla bundle satin alma denemesi yaptin. Biraz bekleyip tekrar dene." },
                { status: 429, headers: buildRateLimitHeaders(rateLimit) }
            );
        }

        const body = await req.json();
        const { bundleId, couponCode } = purchaseBundleSchema.parse(body);

        const result = await purchaseStoreBundle(sessionUser.id, bundleId, couponCode);
        if (!result.ok) {
            if (result.code === "not_found") {
                return NextResponse.json({ error: "Bundle bulunamadi." }, { status: 404 });
            }
            if (result.code === "already_owned") {
                return NextResponse.json({ error: "Bundle icindeki tum urunlere zaten sahipsin." }, { status: 409 });
            }
            if (result.code === "contains_owned_items") {
                return NextResponse.json({ error: "Bundle icinde zaten sahip oldugun urunler var. Once bundlei guncelle." }, { status: 409 });
            }
            if (result.code === "invalid_coupon") {
                return NextResponse.json({ error: "Kupon gecersiz veya bu bundle ile kullanilamaz." }, { status: 409 });
            }
            if (result.code === "promotion_unavailable") {
                return NextResponse.json({ error: "Indirim kampanyasi limiti doldu. Fiyatlari yenileyip tekrar dene." }, { status: 409 });
            }

            return NextResponse.json({ error: "Yetersiz coin." }, { status: 409 });
        }

        await writeAuditLog({
            actor: sessionUser,
            action: "store.purchase.bundle",
            resourceType: "shop_bundle",
            resourceId: result.bundle.id,
            summary: `Purchased bundle ${result.bundle.code}`,
            metadata: {
                code: result.bundle.code,
                finalPriceCoin: result.finalPriceCoin,
                awardedItemCount: result.awardedItems.length,
            },
            request: req,
        });

        return NextResponse.json({
            bundle: result.bundle,
            awardedItems: result.awardedItems,
            coinBalance: result.coinBalance,
            finalPriceCoin: result.finalPriceCoin,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || "Gecersiz veri." }, { status: 422 });
        }

        return NextResponse.json({ error: "Bundle satin alma basarisiz." }, { status: 500 });
    }
}
