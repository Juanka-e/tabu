import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { adminAuditListQuerySchema } from "@/lib/admin-audit/schema";
import { getAdminAuditLogs } from "@/lib/admin-audit/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = adminAuditListQuerySchema.safeParse({
        page: searchParams.get("page") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
        search: searchParams.get("search") ?? undefined,
        action: searchParams.get("action") ?? undefined,
        resourceType: searchParams.get("resourceType") ?? undefined,
        actorRole: searchParams.get("actorRole") ?? undefined,
    });

    if (!parsedQuery.success) {
        return NextResponse.json({ error: "Gecersiz audit filtresi." }, { status: 422 });
    }

    const data = await getAdminAuditLogs(parsedQuery.data);
    return NextResponse.json(data);
}
