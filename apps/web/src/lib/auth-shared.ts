import type { NextAuthConfig } from "next-auth";
import { shouldTrustAuthHost } from "@/lib/auth-host";

export const sharedAuthConfig = {
    providers: [],
    trustHost: shouldTrustAuthHost(),
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub || "";
                session.user.role = (token.role as string) || "user";
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60,
    },
} satisfies NextAuthConfig;
