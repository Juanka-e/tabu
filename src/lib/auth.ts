import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            id: "credentials",
            name: "Giriş Yap",
            credentials: {
                username: { label: "Kullanıcı Adı", type: "text" },
                password: { label: "Şifre", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { username: credentials.username as string },
                });

                if (!user) return null;

                const isValid = await bcryptjs.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isValid) return null;

                return {
                    id: String(user.id),
                    name: user.username,
                    role: user.role, // Pass actual DB role
                };
            },
        }),
        Credentials({
            id: "guest-login",
            name: "Misafir Girişi",
            credentials: {
                guestName: { label: "Misafir Adı", type: "text" }
            },
            async authorize(credentials) {
                // Generate a random temporary guest profile securely
                const guestId = `guest_${crypto.randomUUID()}`;
                const requestedName = credentials?.guestName as string || `Misafir_${Math.floor(1000 + Math.random() * 9000)}`;

                return {
                    id: guestId,
                    name: requestedName,
                    role: "guest"
                };
            }
        })
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role || "guest";
            }
            return token;
        },
        async session({ session, token }) {
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
