import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureUserCore } from "@/lib/economy";

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(300).optional(),
});

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = profileSchema.parse(body);

    await ensureUserCore(sessionUser.id);

    const updated = await prisma.userProfile.update({
      where: { userId: sessionUser.id },
      data: {
        ...(parsed.displayName !== undefined ? { displayName: parsed.displayName } : {}),
        ...(parsed.bio !== undefined ? { bio: parsed.bio } : {}),
      },
      include: {
        avatarItem: true,
        frameItem: true,
        cardBackItem: true,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Gecersiz veri." }, { status: 422 });
    }
    return NextResponse.json({ error: "Profil guncellenemedi." }, { status: 500 });
  }
}