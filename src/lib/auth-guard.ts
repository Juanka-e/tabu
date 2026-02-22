import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type AdminGuardResult =
    | { session: NonNullable<Awaited<ReturnType<typeof auth>>>; error: null }
    | { session: null; error: NextResponse };

/**
 * Zero Trust guard for /api/admin/* route handlers.
 * Independently verifies admin role at the API layer regardless of middleware.
 *
 * Usage:
 *   const { session, error } = await requireAdmin();
 *   if (error) return error;
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
    const session = await auth();

    if (!session) {
        return {
            session: null,
            error: NextResponse.json(
                { error: "Giriş yapmanız gerekiyor." },
                { status: 401 }
            ),
        };
    }

    const role = (session.user as { role?: string } | undefined)?.role;

    if (role !== "admin") {
        return {
            session: null,
            error: NextResponse.json(
                { error: "Bu işlem için yetkiniz yok." },
                { status: 403 }
            ),
        };
    }

    return { session, error: null };
}
