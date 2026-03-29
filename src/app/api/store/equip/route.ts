import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { equipStoreItem } from "@/lib/economy";
import {
  buildRateLimitHeaders,
  consumeRequestRateLimit,
  getRequestIp,
} from "@/lib/security/request-rate-limit";
import { getSystemSettings } from "@/lib/system-settings/service";
import {
  getFeatureDisabledMessage,
  isStoreAvailable,
} from "@/lib/system-settings/policies";

const equipSchema = z.object({
  shopItemId: z.number().int().positive(),
});

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }

  const settings = await getSystemSettings();
  if (!isStoreAvailable(settings)) {
    return NextResponse.json({ error: getFeatureDisabledMessage("store") }, { status: 409 });
  }

  try {
    const rateLimit = consumeRequestRateLimit({
      bucket: "store-equip",
      key: `user:${sessionUser.id}:${getRequestIp(req)}`,
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Cok fazla kusanma istegi gonderdin. Biraz bekleyip tekrar dene." },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const body = await req.json();
    const { shopItemId } = equipSchema.parse(body);

    const result = await equipStoreItem(sessionUser.id, shopItemId);
    if (!result.ok) {
      if (result.code === "not_found") {
        return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });
      }
      return NextResponse.json({ error: "Urun envanterde degil." }, { status: 409 });
    }

    return NextResponse.json({
      profile: result.profile,
      equippedSlots: {
        avatarItemId: result.profile.avatarItemId,
        frameItemId: result.profile.frameItemId,
        cardBackItemId: result.profile.cardBackItemId,
        cardFaceItemId: result.profile.cardFaceItemId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Gecersiz veri." }, { status: 422 });
    }
    return NextResponse.json({ error: "Kusanma islemi basarisiz." }, { status: 500 });
  }
}
