import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LOSS_REWARD, WIN_REWARD, ensureUserCore } from "@/lib/economy";
import { getRoomMatchSnapshot } from "@/lib/socket/game-socket";
import {
  buildRateLimitHeaders,
  consumeRequestRateLimit,
  getRequestIp,
} from "@/lib/security/request-rate-limit";
import { writeAuditLog } from "@/lib/security/audit-log";

const finalizeSchema = z.object({
  roomCode: z.string().trim().min(4).max(10),
});

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }

  try {
    const rateLimit = consumeRequestRateLimit({
      bucket: "match-finalize",
      key: `user:${sessionUser.id}:${getRequestIp(req)}`,
      windowMs: 60_000,
      maxRequests: 6,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Cok fazla odul denemesi yaptin. Biraz bekleyip tekrar dene." },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const body = await req.json();
    const { roomCode } = finalizeSchema.parse(body);

    const existing = await prisma.matchResult.findUnique({
      where: { roomCode_userId: { roomCode: roomCode.toUpperCase(), userId: sessionUser.id } },
    });
    if (existing) {
      return NextResponse.json({
        alreadyClaimed: true,
        coinEarned: existing.coinEarned,
        won: existing.won,
      });
    }

    const room = getRoomMatchSnapshot(roomCode.toUpperCase());
    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadi." }, { status: 404 });
    }
    if (room.oyunAktifMi) {
      return NextResponse.json({ error: "Mac henuz tamamlanmadi." }, { status: 409 });
    }

    const participant = room.oyuncular.find((p) => p.userId === sessionUser.id);
    if (!participant) {
      return NextResponse.json({ error: "Oyuncu dogrulanamadi." }, { status: 403 });
    }

    const winner = room.skor.A === room.skor.B ? "Berabere" : room.skor.A > room.skor.B ? "A" : "B";
    const won = winner !== "Berabere" && participant.takim === winner;
    const coinEarned = winner === "Berabere" ? LOSS_REWARD : won ? WIN_REWARD : LOSS_REWARD;

    await ensureUserCore(sessionUser.id);

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.matchResult.create({
        data: {
          roomCode: room.odaKodu,
          userId: sessionUser.id,
          playerId: participant.playerId,
          team: participant.takim,
          won,
          scoreA: room.skor.A,
          scoreB: room.skor.B,
          coinEarned,
          gameType: "tabu",
        },
      });

      await tx.wallet.update({
        where: { userId: sessionUser.id },
        data: { coinBalance: { increment: coinEarned } },
      });

      const wallet = await tx.wallet.findUnique({ where: { userId: sessionUser.id } });
      return { created, wallet };
    });

    await writeAuditLog({
      actor: sessionUser,
      action: "game.match.finalize",
      resourceType: "match_result",
      resourceId: result.created.id,
      summary: `Finalized match reward for room ${room.odaKodu}`,
      metadata: {
        roomCode: room.odaKodu,
        won,
        coinEarned,
      },
      request: req,
    });

    return NextResponse.json({
      coinEarned,
      won,
      coinBalance: result.wallet?.coinBalance ?? 0,
      matchId: result.created.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Gecersiz veri." }, { status: 422 });
    }

    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Odul zaten alinmis." }, { status: 409 });
    }

    return NextResponse.json({ error: "Mac sonucu kaydedilemedi." }, { status: 500 });
  }
}
