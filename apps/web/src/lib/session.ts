import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearExpiredSuspensions, isSuspensionActive } from "@/lib/moderation/service";

export async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) return null;
    const userId = Number(session.user.id);
    if (!Number.isInteger(userId) || userId <= 0) return null;

    await clearExpiredSuspensions();
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            username: true,
            isSuspended: true,
            suspendedUntil: true,
        },
    });
    if (!user || isSuspensionActive(user)) {
        return null;
    }

    return {
        id: user.id,
        role: user.role || "user",
        name: user.username || "",
    };
}
