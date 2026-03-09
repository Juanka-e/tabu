import { NextResponse } from "next/server";
import { getStoreCatalog } from "@/lib/economy";
import { getSessionUser } from "@/lib/session";

export async function GET() {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const catalog = await getStoreCatalog(sessionUser.id);
    return NextResponse.json(catalog);
}
