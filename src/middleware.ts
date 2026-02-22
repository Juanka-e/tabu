import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "@auth/core/types";
import { rateLimit } from "@/lib/rate-limit";

export default auth((req: NextRequest & { auth: Session | null }) => {
    const { pathname } = req.nextUrl;
    const method = req.method;

    // Rate limiting: brute-force protection on login endpoints
    if (
        method === "POST" &&
        (pathname === "/api/auth/callback/credentials" ||
            pathname === "/api/auth/signin/credentials")
    ) {
        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
            req.headers.get("x-real-ip") ??
            "unknown";
        const rl = rateLimit(ip, "login");
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Çok fazla giriş denemesi. Lütfen bekleyin." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
                        "X-RateLimit-Remaining": "0",
                    },
                }
            );
        }
    }

    // Protect admin routes (except login)
    if (pathname.startsWith("/admin")) {
        if (!req.auth || (req.auth.user as { role?: string })?.role !== "admin") {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // Protect admin API routes
    if (pathname.startsWith("/api/admin")) {
        if (!req.auth || (req.auth.user as { role?: string })?.role !== "admin") {
            return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        "/admin/:path*",
        "/api/admin/:path*",
        "/api/auth/callback/credentials",
        "/api/auth/signin/credentials",
    ],
};

