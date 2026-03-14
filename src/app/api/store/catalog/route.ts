import { NextResponse } from "next/server";
import { getStoreCatalog } from "@/lib/economy";
import { getSessionUser } from "@/lib/session";
import { getSystemSettings } from "@/lib/system-settings/service";
import {
    getFeatureDisabledMessage,
    isStoreAvailable,
} from "@/lib/system-settings/policies";

export async function GET() {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const settings = await getSystemSettings();
    if (!isStoreAvailable(settings)) {
        return NextResponse.json(
            { error: getFeatureDisabledMessage("store") },
            { status: 409 }
        );
    }

    const catalog = await getStoreCatalog(sessionUser.id, settings);
    return NextResponse.json(catalog);
}
