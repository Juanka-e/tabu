import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default auth((req: any) => {
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

    return NextResponse.next();
});

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
