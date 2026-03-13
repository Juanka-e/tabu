
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

const registerSchema = z.object({
    username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır."),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
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
        const { username, password } = registerSchema.parse(body);
        const settings = await getSystemSettings();

        if (!isRegistrationAvailable(settings)) {
            return NextResponse.json(
                { error: getFeatureDisabledMessage("register") },
                { status: 409 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Bu kullanıcı adı zaten alınmış." },
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
            { message: "Kayıt başarılı.", userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
                return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Kayıt sırasında bir hata oluştu." },
            { status: 500 }
        );
    }
}
