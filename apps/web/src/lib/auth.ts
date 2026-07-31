import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import {
    checkPasswordLoginRateLimit,
    clearPasswordLoginAccountFailures,
    recordPasswordLoginFailure,
} from "@hushle/platform-auth";
import { prisma } from "@/lib/prisma";
import { sharedAuthConfig } from "@/lib/auth-shared";
import { getSystemSettings } from "@/lib/system-settings/service";
import { verifyCaptchaForAction } from "@/lib/security/captcha";
import { getRequestIp } from "@/lib/security/request-rate-limit";
import { recordUserAccessSignal } from "@/lib/security/user-access-signal";
import { clearExpiredSuspensions, isSuspensionActive } from "@/lib/moderation/service";

const DUMMY_PASSWORD_HASH =
    "$2b$10$fZX8p9xEhu7surFIEeFgmectWV9l4AH.2tF2nIliwfWhnRLKK21nO";

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
                const username =
                    typeof credentials?.username === "string"
                        ? credentials.username.trim()
                        : "";
                const password =
                    typeof credentials?.password === "string"
                        ? credentials.password
                        : "";
                const portal =
                    typeof credentials?.portal === "string"
                        ? credentials.portal
                        : "user";

                if (
                    !username ||
                    username.length > 50 ||
                    !password ||
                    password.length > 255
                ) {
                    return null;
                }

                const remoteIp = getRequestIp(request);
                const loginLimit = await checkPasswordLoginRateLimit({
                    remoteIp,
                    username,
                });
                if (!loginLimit.allowed) {
                    return null;
                }

                const settings = await getSystemSettings();
                const captchaResult = await verifyCaptchaForAction({
                    action: "login",
                    token: typeof credentials.captchaToken === "string" ? credentials.captchaToken : null,
                    remoteIp,
                    settings,
                });
                if (!captchaResult.ok) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { username },
                    select: {
                        id: true,
                        username: true,
                        password: true,
                        role: true,
                        isSuspended: true,
                        suspendedUntil: true,
                    },
                });
                const isValid = await bcryptjs.compare(
                    password,
                    user?.password ?? DUMMY_PASSWORD_HASH
                );
                if (!user || !isValid) {
                    await recordPasswordLoginFailure({
                        remoteIp,
                        username,
                    });
                    return null;
                }

                await clearPasswordLoginAccountFailures(username);
                await clearExpiredSuspensions();
                if (isSuspensionActive(user)) {
                    return null;
                }

                if (portal === "admin" && user.role !== "admin") {
                    return null;
                }

                await recordUserAccessSignal({
                    userId: user.id,
                    request,
                });

                return {
                    id: String(user.id),
                    name: user.username,
                    role: user.role,
                };
            },
        }),
    ],
});
