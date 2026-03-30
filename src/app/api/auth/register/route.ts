import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import {
    buildRateLimitHeaders,
    consumeRequestRateLimit,
    getRequestIp,
} from "@/lib/security/request-rate-limit";
import { getSystemSettings } from "@/lib/system-settings/service";
import {
    getFeatureDisabledMessage,
    isRegistrationAvailable,
} from "@/lib/system-settings/policies";
import { verifyCaptchaForAction } from "@/lib/security/captcha";
import {
    isEmailWithinLimit,
    normalizeEmail,
    sanitizeEmail,
} from "@/lib/users/email";
import { recordUserRegistrationSignal } from "@/lib/security/user-access-signal";

const registerSchema = z.object({
    username: z.string().min(3, "Kullanici adi en az 3 karakter olmalidir."),
    email: z.email("Gecerli bir e-posta adresi girilmelidir."),
    password: z.string().min(6, "Sifre en az 6 karakter olmalidir."),
    captchaToken: z.string().trim().min(1).optional().nullable(),
});

export async function POST(req: Request) {
    try {
        const rateLimit = consumeRequestRateLimit({
            bucket: "auth-register",
            key: `ip:${getRequestIp(req)}`,
            windowMs: 10 * 60_000,
            maxRequests: 5,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Cok fazla kayit denemesi yaptiniz. Daha sonra tekrar deneyin." },
                { status: 429, headers: buildRateLimitHeaders(rateLimit) }
            );
        }

        const body = await req.json();
        const { username, email, password, captchaToken } = registerSchema.parse(body);
        const settings = await getSystemSettings();
        const sanitizedEmail = sanitizeEmail(email);
        const normalizedEmail = normalizeEmail(email);

        if (!isEmailWithinLimit(sanitizedEmail)) {
            return NextResponse.json(
                { error: "E-posta adresi cok uzun." },
                { status: 400 }
            );
        }

        if (!isRegistrationAvailable(settings)) {
            return NextResponse.json(
                { error: getFeatureDisabledMessage("register") },
                { status: 409 }
            );
        }

        const captchaResult = await verifyCaptchaForAction({
            action: "register",
            token: captchaToken ?? null,
            remoteIp: getRequestIp(req),
            settings,
        });
        if (!captchaResult.ok) {
            return NextResponse.json(
                { error: "Guvenlik dogrulamasi basarisiz. Lutfen tekrar deneyin." },
                { status: 403 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Bu kullanici adi zaten alinmis." },
                { status: 400 }
            );
        }

        const existingEmailUser = await prisma.user.findUnique({
            where: { normalizedEmail },
            select: { id: true },
        });
        if (existingEmailUser) {
            return NextResponse.json(
                { error: "Bu e-posta adresi zaten kullaniliyor." },
                { status: 400 }
            );
        }

        const hashedPassword = await bcryptjs.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email: sanitizedEmail,
                normalizedEmail,
                password: hashedPassword,
                role: "user",
                wallet: {
                    create: { coinBalance: settings.economy.startingCoinBalance },
                },
                profile: {
                    create: {},
                },
            },
        });

        await recordUserRegistrationSignal({
            userId: user.id,
            request: req,
        });

        return NextResponse.json(
            { message: "Kayit basarili.", userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Kayit sirasinda bir hata olustu." },
            { status: 500 }
        );
    }
}
