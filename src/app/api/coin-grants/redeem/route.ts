import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { coinGrantRedeemSchema } from "@/lib/coin-grants/schema";
import { redeemCoinGrantCode } from "@/lib/coin-grants/service";
import { writeAuditLog } from "@/lib/security/audit-log";
import { buildRateLimitHeaders, consumeRequestRateLimit, getRequestIp } from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const rateLimit = consumeRequestRateLimit({
        bucket: "coin-grant-redeem",
        key: `user:${sessionUser.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 12,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Cok fazla coin kodu denemesi. Lutfen biraz bekleyin." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    try {
        const body = await request.json();
        const redeem = coinGrantRedeemSchema.parse(body);
        const result = await redeemCoinGrantCode({ userId: sessionUser.id, redeem });

        if (!result.ok) {
            const status = result.code === "not_found" ? 404 : 409;
            const messages: Record<string, string> = {
                not_found: "Coin kodu bulunamadi.",
                inactive: "Bu coin kodu aktif degil.",
                expired: "Bu coin kodunun suresi dolmus.",
                campaign_not_started: "Bu kampanya henuz baslamadi.",
                campaign_ended: "Bu kampanya sona ermis.",
                campaign_budget_exhausted: "Bu kampanyanin butcesi tukendi.",
                campaign_claim_limit_reached: "Bu kampanyanin kullanim limiti doldu.",
                user_claim_limit_reached: "Bu kampanya icin kendi kullanim limitine ulastin.",
                code_claim_limit_reached: "Bu coin kodunun kullanim limiti doldu.",
            };

            return NextResponse.json({ error: messages[result.code] || "Coin kodu kullanilamadi.", code: result.code }, { status });
        }

        await writeAuditLog({
            actor: sessionUser,
            action: "user.coin_grant.claim",
            resourceType: "coin_grant_claim",
            resourceId: result.claim.id,
            summary: `claimed ${result.coinAmount} coin via ${result.code.code}`,
            metadata: {
                rewardSource: "promo_claim",
                campaignId: result.campaign.id,
                campaignCode: result.campaign.code,
                grantCode: result.code.code,
                coinAmount: result.coinAmount,
                coinBalance: result.coinBalance,
            },
            request,
        });

        return NextResponse.json({
            ok: true,
            coinAmount: result.coinAmount,
            coinBalance: result.coinBalance,
        });
    } catch (error) {
        if (error instanceof Error && "issues" in error) {
            const zodError = error as Error & { issues?: Array<{ message?: string }> };
            return NextResponse.json({ error: zodError.issues?.[0]?.message || "Gecersiz coin kodu." }, { status: 422 });
        }

        console.error("Failed to redeem coin grant code:", error);
        return NextResponse.json({ error: "Coin kodu kullanilamadi." }, { status: 500 });
    }
}
