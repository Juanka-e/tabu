// NOTE: next-auth@5.0.0-beta has unstable types. Use type cast to avoid
// '@ts-nocheck' which is banned by ESLint. Remove once next-auth v5 stable.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const createNextAuth = NextAuth as unknown as Function;
export const { handlers, signIn, signOut, auth } = createNextAuth({
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

                // Check if user has admin role
                if (user.role !== "admin") return null;

                return {
                    id: String(user.id),
                    name: user.username,
                    role: user.role,
                };
            },
        }),
    ],
    pages: {
        signIn: "/admin/login",
    },
    callbacks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async jwt({ token, user }: { token: any; user?: any }) {
            if (user) {
                token.role = "admin";
            }
            return token;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async session({ session, token }: { session: any; token: any }) {
            if (session.user) {
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
});
