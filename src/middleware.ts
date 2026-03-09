import NextAuth from "next-auth";
import { sharedAuthConfig } from "@/lib/auth-shared";
import { NextResponse } from "next/server";
import { isTrustedStateChangeRequest } from "@/lib/security/request-origin";

const { auth } = NextAuth(sharedAuthConfig);

function isAuthed(req: { auth?: { user?: { id?: string } } | null }): boolean {
    return Boolean(req.auth?.user?.id);
}

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const role = (req.auth?.user as { role?: string } | undefined)?.role;
    const requestLike = {
        headers: req.headers,
        method: req.method,
        url: req.url,
    };

    if (
        pathname.startsWith("/api/") &&
        !isTrustedStateChangeRequest(requestLike)
    ) {
        return NextResponse.json({ error: "Origin dogrulamasi basarisiz." }, { status: 403 });
    }

    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
        if (!isAuthed(req) || role !== "admin") {
            const loginUrl = new URL("/admin/login", req.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    if (pathname.startsWith("/api/admin")) {
        if (!isAuthed(req) || role !== "admin") {
            return NextResponse.json({ error: "Yetkisiz erisim." }, { status: 401 });
        }
    }

    if (pathname.startsWith("/dashboard") || pathname.startsWith("/profile") || pathname.startsWith("/store")) {
        if (!isAuthed(req)) {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    if (pathname.startsWith("/api/user") || pathname.startsWith("/api/store") || pathname.startsWith("/api/game")) {
        if (!isAuthed(req)) {
            return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        "/admin/:path*",
        "/api/admin/:path*",
        "/dashboard/:path*",
        "/profile/:path*",
        "/store/:path*",
        "/api/user/:path*",
        "/api/store/:path*",
        "/api/game/:path*",
        "/api/auth/register",
    ],
};
