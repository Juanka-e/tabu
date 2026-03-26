import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";
import { writeAuditLog } from "@/lib/security/audit-log";
import { supportTicketCreateSchema } from "@/lib/support/schema";
import { createSupportTicketForUser, listSupportTicketsForUser } from "@/lib/support/service";

export const dynamic = "force-dynamic";

export async function GET() {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const result = await listSupportTicketsForUser(sessionUser.id);
    return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const rateLimit = consumeRequestRateLimit({
        bucket: "support-ticket-create",
        key: `user:${sessionUser.id}:${getRequestIp(request)}`,
        windowMs: 60 * 60 * 1000,
        maxRequests: 6,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Cok fazla destek talebi olusturuldu. Lutfen biraz bekleyin." },
            { status: 429, headers: buildRateLimitHeaders(rateLimit) }
        );
    }

    try {
        const body = await request.json();
        const input = supportTicketCreateSchema.parse(body);
        const ticket = await createSupportTicketForUser(sessionUser.id, input);

        await writeAuditLog({
            actor: sessionUser,
            action: "user.support_ticket.create",
            resourceType: "support_ticket",
            resourceId: ticket.id,
            summary: `created support ticket ${ticket.subject}`,
            metadata: {
                category: ticket.category,
                status: ticket.status,
            },
            request,
        });

        return NextResponse.json(ticket, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.issues[0]?.message || "Gecersiz destek talebi." },
                { status: 422 }
            );
        }

        console.error("Failed to create support ticket:", error);
        return NextResponse.json({ error: "Destek talebi olusturulamadi." }, { status: 500 });
    }
}

