// NOTE: next-auth@5.0.0-beta.30 default export loses its call signature under
// moduleResolution:"bundler". @ts-expect-error is preferred over 'any' or @ts-nocheck.
// Remove once next-auth v5 reaches stable.
import NextAuthImport from "next-auth";
import type { JWT } from "@auth/core/jwt";
import type { Session, User } from "@auth/core/types";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

// @ts-expect-error – beta type limitation, see note above
export const { handlers, signIn, signOut, auth } = NextAuthImport({
    providers: [
        Credentials({
            name: "Admin Login",
            credentials: {
                username: { label: "Kullanıcı Adı", type: "text" },
                password: { label: "Şifre", type: "password" },
            },
            async authorize(credentials) {
                const username = credentials?.username as string | undefined;
                const password = credentials?.password as string | undefined;

                if (!username || !password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { username },
                });

                if (!user) return null;

                const isValid = await bcryptjs.compare(password, user.password);

                if (!isValid) return null;

                return {
                    id: String(user.id),
                    name: user.username,
                    role: user.role, // "user" | "admin" — admin panel access controlled by middleware
                };
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }: { token: JWT; user?: User }) {
            if (user) {
                token.role = (user as { role?: string }).role ?? "user";
            }
            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            if (session.user) {
                (session.user as Session["user"] & { role?: string }).role =
                    token.role as string;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
});
