import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getOnlineRoomMembership } from "@/lib/socket/room-membership";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";
import { recordUserAccessSignal } from "@/lib/security/user-access-signal";

export async function GET(request: Request) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const rateLimit = consumeRequestRateLimit({
        bucket: "user-active-room-read",
        key: `user:${sessionUser.id}:${getRequestIp(request)}`,
        windowMs: 60_000,
        maxRequests: 120,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Cok fazla aktif oda istegi gonderildi. Lutfen biraz bekleyin." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    const roomCode = await getOnlineRoomMembership(sessionUser.id);
    await recordUserAccessSignal({ userId: sessionUser.id, request });

    return NextResponse.json(
        { roomCode },
        { headers: buildRateLimitHeaders(rateLimit) }
    );
}
