import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const { pathname } = req.nextUrl;

    // Protect admin routes (except login)
    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
        if (!req.auth || (req.auth.user as { role?: string })?.role !== "admin") {
            const loginUrl = new URL("/admin/login", req.url);
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

    // Protect room routes
    if (pathname.startsWith("/room")) {
        if (!req.auth) {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*", "/room/:path*"],
};
