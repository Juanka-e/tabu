import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { sharedAuthConfig } from "@/lib/auth-shared";
import {
    evaluateAdminAccess,
    getAdminAccessFailureMessage,
} from "@/lib/admin/access-policy";
import { isTrustedStateChangeRequest } from "@/lib/security/request-origin";
import {
    buildContentSecurityPolicy,
    generateCspNonce,
} from "@/lib/security/content-security-policy";

const { auth } = NextAuth(sharedAuthConfig);

function isAuthed(req: { auth?: { user?: { id?: string } } | null }): boolean {
    return Boolean(req.auth?.user?.id);
}

function shouldApplyPageCsp(req: NextRequest): boolean {
    if (req.nextUrl.pathname.startsWith("/api/")) {
        return false;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        return false;
    }

    const acceptHeader = req.headers.get("accept");
    return acceptHeader?.includes("text/html") ?? false;
}

function createPageResponse(req: NextRequest): NextResponse {
    const nonce = generateCspNonce();
    const csp = buildContentSecurityPolicy({
        nonce,
        isDev: process.env.NODE_ENV !== "production",
    });
    const requestHeaders = new Headers(req.headers);

    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("x-pathname", req.nextUrl.pathname);
    requestHeaders.set("Content-Security-Policy", csp);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("x-nonce", nonce);
    response.headers.set("x-pathname", req.nextUrl.pathname);

    return response;
}

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const role = (req.auth?.user as { role?: string } | undefined)?.role;
    const adminAccess = evaluateAdminAccess(req);
    const requestLike = {
        headers: req.headers,
        method: req.method,
        url: req.url,
    };

    if (
        pathname.startsWith("/api/") &&
        !isTrustedStateChangeRequest(requestLike)
    ) {
        return NextResponse.json(
            { error: "Origin dogrulamasi basarisiz." },
            { status: 403 }
        );
    }

    if (pathname === "/admin" && !isAuthed(req)) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    if (
        (pathname === "/admin" ||
            pathname.startsWith("/admin/") ||
            pathname.startsWith("/admin/login") ||
            pathname.startsWith("/api/admin")) &&
        !adminAccess.allowed
    ) {
        if (pathname.startsWith("/api/admin")) {
            return NextResponse.json(
                { error: getAdminAccessFailureMessage(adminAccess) },
                { status: 403 }
            );
        }

        return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
        if (!isAuthed(req)) {
            const loginUrl = new URL("/admin/login", req.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }

        if (role !== "admin") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    if (pathname.startsWith("/admin/login") && isAuthed(req)) {
        if (role === "admin") {
            return NextResponse.redirect(new URL("/admin", req.url));
        }

        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (pathname.startsWith("/api/admin")) {
        if (!isAuthed(req) || role !== "admin") {
            return NextResponse.json(
                { error: "Yetkisiz erisim." },
                { status: 401 }
            );
        }
    }

    if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/store")
    ) {
        if (!isAuthed(req)) {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    if (
        pathname.startsWith("/api/user") ||
        pathname.startsWith("/api/notifications") ||
        pathname.startsWith("/api/store") ||
        pathname.startsWith("/api/game")
    ) {
        if (!isAuthed(req)) {
            return NextResponse.json(
                { error: "Giris gerekli." },
                { status: 401 }
            );
        }
    }

    if (shouldApplyPageCsp(req)) {
        return createPageResponse(req);
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        {
            source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
        "/api/admin/:path*",
        "/api/support/:path*",
        "/api/coin-grants/:path*",
        "/api/notifications/:path*",
        "/api/notifications/archive-all",
        "/api/user/:path*",
        "/api/store/:path*",
        "/api/game/:path*",
        "/api/auth/register",
    ],
};
