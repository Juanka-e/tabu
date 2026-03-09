import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sharedAuthConfig } from "@/lib/auth-shared";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...sharedAuthConfig,
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                username: { label: "Kullanici Adi", type: "text" },
                password: { label: "Sifre", type: "password" },
                portal: { label: "Portal", type: "text" },
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

                const portal = String(credentials.portal || "user");
                if (portal === "admin" && user.role !== "admin") {
                    return null;
                }

                return {
                    id: String(user.id),
                    name: user.username,
                    role: user.role,
                };
            },
        }),
    ],
});
