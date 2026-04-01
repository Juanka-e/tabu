import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureUserCore } from "@/lib/economy";
import { getRoomMatchSnapshot } from "@/lib/socket/game-socket";
import { evaluateMatchRewardEligibility } from "@/lib/economy/reward-eligibility";
import {
  buildRateLimitHeaders,
  consumeRequestRateLimit,
  getRequestIp,
} from "@/lib/security/request-rate-limit";
import { writeAuditLog } from "@/lib/security/audit-log";
import { getSystemSettings } from "@/lib/system-settings/service";

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
    const settings = await getSystemSettings();
    const room = getRoomMatchSnapshot(roomCode.toUpperCase());
    const evaluation = evaluateMatchRewardEligibility({
      userId: sessionUser.id,
      room,
      existingMatchResult: existing,
      settings,
      now: new Date(),
    });

    if (evaluation.decision === "deny") {
      const primaryReason = evaluation.reasonCodes[0];

      if (primaryReason === "already_claimed" && existing) {
        return NextResponse.json({
          alreadyClaimed: true,
          coinEarned: existing.coinEarned,
          won: existing.won,
          rewardSource: evaluation.source,
          eligibilityDecision: evaluation.decision,
          eligibilityReasons: evaluation.reasonCodes,
          reviewFlags: evaluation.reviewFlags,
        });
      }

      if (primaryReason === "room_not_found") {
        return NextResponse.json({ error: "Oda bulunamadi." }, { status: 404 });
      }

      if (primaryReason === "match_not_completed") {
        return NextResponse.json({ error: "Mac henuz tamamlanmadi." }, { status: 409 });
      }

      if (primaryReason === "participant_not_found") {
        return NextResponse.json({ error: "Oyuncu dogrulanamadi." }, { status: 403 });
      }

      return NextResponse.json({ error: "Mac odulu icin uygunluk saglanamadi." }, { status: 409 });
    }

    if (!room) {
      return NextResponse.json({ error: "Oda bulunamadi." }, { status: 404 });
    }

    const coinEarned = evaluation.finalRewardCoin;

    await ensureUserCore(sessionUser.id);

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.matchResult.create({
        data: {
          roomCode: room.odaKodu,
          userId: sessionUser.id,
          playerId: evaluation.participantPlayerId,
          team: evaluation.participantTeam,
          won: evaluation.won,
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
        rewardSource: evaluation.source,
        eligibilityDecision: evaluation.decision,
        eligibilityReasons: evaluation.reasonCodes,
        reviewFlags: evaluation.reviewFlags,
        totalPlayers: evaluation.roomMetrics.totalPlayers,
        authenticatedPlayers: evaluation.roomMetrics.authenticatedPlayers,
        guestPlayers: evaluation.roomMetrics.guestPlayers,
        roomCode: room.odaKodu,
        won: evaluation.won,
        coinEarned,
        baseRewardCoin: evaluation.baseRewardCoin,
        rewardMultiplier: evaluation.modifiers.rewardMultiplier,
        weekendBoostApplied: evaluation.modifiers.weekendBoostApplied,
        reducedByRules: evaluation.modifiers.reducedByRules,
      },
      request: req,
    });

    return NextResponse.json({
      coinEarned,
      won: evaluation.won,
      coinBalance: result.wallet?.coinBalance ?? 0,
      matchId: result.created.id,
      rewardSource: evaluation.source,
      eligibilityDecision: evaluation.decision,
      reviewFlags: evaluation.reviewFlags,
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
