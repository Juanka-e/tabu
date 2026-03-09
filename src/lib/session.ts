import { auth } from "@/lib/auth";

export async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) return null;
    const userId = Number(session.user.id);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    return {
        id: userId,
        role: session.user.role || "user",
        name: session.user.name || "",
    };
}
