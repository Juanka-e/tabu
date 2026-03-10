import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoreCatalog } from "@/lib/economy";
import { getSessionUser } from "@/lib/session";
import { STORE_ITEM_TYPES } from "@/types/economy";

const querySchema = z.object({
  type: z.enum(STORE_ITEM_TYPES).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ type: searchParams.get("type") || undefined });

  if (!parsed.success) {
    return NextResponse.json({ error: "Gecersiz filtre." }, { status: 422 });
  }

  const sessionUser = await getSessionUser();
  const catalog = await getStoreCatalog(sessionUser?.id);
  const items = parsed.data.type
    ? catalog.items.filter((item) => item.type === parsed.data.type)
    : catalog.items;

  return NextResponse.json({ items });
}
