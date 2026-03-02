import { NextResponse } from "next/server";
import { z } from "zod";
import { ShopItemType } from "@prisma/client";
import { listStoreItems } from "@/lib/economy";

const querySchema = z.object({
  type: z.nativeEnum(ShopItemType).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ type: searchParams.get("type") || undefined });

  if (!parsed.success) {
    return NextResponse.json({ error: "Gecersiz filtre." }, { status: 422 });
  }

  const items = await listStoreItems(parsed.data.type);
  return NextResponse.json({ items });
}