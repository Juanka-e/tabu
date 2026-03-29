import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { getAdminUsers } from "@/lib/moderation/service";
import { moderationListQuerySchema } from "@/lib/moderation/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = moderationListQuerySchema.safeParse({
        page: searchParams.get("page") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
        search: searchParams.get("search") ?? undefined,
        status: searchParams.get("status") ?? undefined,
    });

    if (!parsedQuery.success) {
        return NextResponse.json({ error: "Gecersiz filtre." }, { status: 422 });
    }

    const data = await getAdminUsers(parsedQuery.data);
    return NextResponse.json(data);
}

