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

const registerSchema = z.object({
    username: z.string().min(3, "Kullanici adi en az 3 karakter olmalidir."),
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
        const { username, password, captchaToken } = registerSchema.parse(body);
        const settings = await getSystemSettings();

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

        const hashedPassword = await bcryptjs.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
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
