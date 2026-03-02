import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getProfileData, ensureUserCore } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }

  await ensureUserCore(sessionUser.id);
  const [{ profile, inventory }, wallet] = await Promise.all([
    getProfileData(sessionUser.id),
    prisma.wallet.findUnique({ where: { userId: sessionUser.id } }),
  ]);

  return NextResponse.json({
    id: sessionUser.id,
    name: sessionUser.name,
    role: sessionUser.role,
    profile,
    inventory,
    wallet,
  });
}
