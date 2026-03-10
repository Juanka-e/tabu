import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getInventoryData } from "@/lib/economy";

export async function GET() {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const data = await getInventoryData(sessionUser.id);
    return NextResponse.json(data);
}
