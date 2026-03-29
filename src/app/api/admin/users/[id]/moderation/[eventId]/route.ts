import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/security/audit-log";

export const dynamic = "force-dynamic";

const routeParamsSchema = z.object({
    id: z.coerce.number().int().min(1),
    eventId: z.coerce.number().int().min(1),
});

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string; eventId: string }> }
) {
    const adminSession = await requireAdminSession();
    if (adminSession instanceof NextResponse) {
        return adminSession;
    }

    const params = await context.params;
    const parsedParams = routeParamsSchema.safeParse(params);
    if (!parsedParams.success) {
        return NextResponse.json({ error: "Gecersiz moderasyon kaydi." }, { status: 422 });
    }

    const { id: targetUserId, eventId } = parsedParams.data;

    const targetEvent = await prisma.userModerationEvent.findFirst({
        where: {
            id: eventId,
            targetUserId,
        },
        select: {
            id: true,
            actionType: true,
            reason: true,
        },
    });

    if (!targetEvent) {
        return NextResponse.json({ error: "Moderasyon kaydi bulunamadi." }, { status: 404 });
    }

    if (targetEvent.actionType !== "note") {
        return NextResponse.json(
            { error: "Sadece ic not kayitlari silinebilir." },
            { status: 403 }
        );
    }

    await prisma.userModerationEvent.delete({
        where: {
            id: targetEvent.id,
        },
    });

    await writeAuditLog({
        actor: adminSession,
        action: "admin.user.note.delete",
        resourceType: "user",
        resourceId: targetUserId,
        summary: `Deleted moderation note ${eventId}`,
        metadata: {
            targetUserId,
            deletedEventId: eventId,
        },
        request,
    });

    return NextResponse.json({ ok: true });
}
