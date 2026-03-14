import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { coinGrantCodeBatchCreateSchema } from "@/lib/coin-grants/schema";
import { createCoinGrantCodes } from "@/lib/coin-grants/service";
import { writeAuditLog } from "@/lib/security/audit-log";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    try {
        const rateLimit = consumeRequestRateLimit({
            bucket: "admin-coin-grant-code-create",
            key: `admin:${adminSession.id}:${getRequestIp(request)}`,
            windowMs: 60_000,
            maxRequests: 30,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Cok fazla coin kodu olusturma denemesi. Lutfen biraz bekleyin." },
                { status: 429, headers: buildRateLimitHeaders(rateLimit) }
            );
        }

        const body = await request.json();
        const input = coinGrantCodeBatchCreateSchema.parse(body);
        const codes = await createCoinGrantCodes(input);

        if (codes.length === 0) {
            return NextResponse.json({ error: "Kodlar olusturulamadi. Prefix veya campaign kontrol edin." }, { status: 422 });
        }

        await writeAuditLog({
            actor: adminSession,
            action: "admin.coin_grant_code.create",
            resourceType: "coin_grant_code",
            resourceId: codes[0]?.id ?? null,
            summary: `created ${codes.length} coin grant code(s)` ,
            metadata: {
                campaignId: input.campaignId,
                quantity: codes.length,
                firstCode: codes[0]?.code ?? null,
            },
            request,
        });

        return NextResponse.json(codes, { status: 201 });
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
            return NextResponse.json({ error: "Uretilen kodlardan biri zaten kullanimda." }, { status: 409 });
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || "Gecersiz kod verisi." }, { status: 422 });
        }

        console.error("Failed to create coin grant codes:", error);
        return NextResponse.json({ error: "Coin kodlari olusturulamadi." }, { status: 500 });
    }
}
