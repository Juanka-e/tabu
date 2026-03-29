import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getDashboardData } from "@/lib/economy";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }

  const data = await getDashboardData(sessionUser.id);
  return NextResponse.json(data);
}