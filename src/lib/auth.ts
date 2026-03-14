import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sharedAuthConfig } from "@/lib/auth-shared";
import { getSystemSettings } from "@/lib/system-settings/service";
import { verifyCaptchaForAction } from "@/lib/security/captcha";
import { getRequestIp } from "@/lib/security/request-rate-limit";
import { clearExpiredSuspensions, isSuspensionActive } from "@/lib/moderation/service";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...sharedAuthConfig,
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                username: { label: "Kullanici Adi", type: "text" },
                password: { label: "Sifre", type: "password" },
                portal: { label: "Portal", type: "text" },
                captchaToken: { label: "Captcha Token", type: "text" },
                captchaAction: { label: "Captcha Action", type: "text" },
            },
            async authorize(credentials, request) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                const settings = await getSystemSettings();
                const captchaResult = await verifyCaptchaForAction({
                    action: "login",
                    token: typeof credentials.captchaToken === "string" ? credentials.captchaToken : null,
                    remoteIp: getRequestIp(request),
                    settings,
                });
                if (!captchaResult.ok) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { username: credentials.username as string },
                    select: {
                        id: true,
                        username: true,
                        password: true,
                        role: true,
                        isSuspended: true,
                        suspendedUntil: true,
                    },
                });
                if (!user) return null;

                await clearExpiredSuspensions();
                if (isSuspensionActive(user)) {
                    return null;
                }

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
