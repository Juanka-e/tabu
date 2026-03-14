import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureUserCore } from "@/lib/economy";
import {
  buildRateLimitHeaders,
  consumeRequestRateLimit,
  getRequestIp,
} from "@/lib/security/request-rate-limit";
import { writeAuditLog } from "@/lib/security/audit-log";
import {
  areEmailsEqual,
  isEmailWithinLimit,
  normalizeEmail,
  sanitizeEmail,
} from "@/lib/users/email";

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(300).optional(),
  email: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmedValue = value.trim();
      return trimmedValue.length === 0 ? undefined : trimmedValue;
    },
    z.email("Gecerli bir e-posta adresi girilmelidir.").optional()
  ),
});

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
  }

  try {
    const rateLimit = consumeRequestRateLimit({
      bucket: "user-profile-update",
      key: `user:${sessionUser.id}:${getRequestIp(req)}`,
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Cok fazla profil guncelleme istegi gonderdin. Biraz bekleyip tekrar dene." },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const body = await req.json();
    const parsed = profileSchema.parse(body);
    const sanitizedEmail = parsed.email !== undefined ? sanitizeEmail(parsed.email) : undefined;
    const normalizedEmail = sanitizedEmail !== undefined ? normalizeEmail(sanitizedEmail) : undefined;

    if (sanitizedEmail !== undefined && !isEmailWithinLimit(sanitizedEmail)) {
      return NextResponse.json({ error: "E-posta adresi cok uzun." }, { status: 422 });
    }

    await ensureUserCore(sessionUser.id);

    const currentUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        email: true,
        normalizedEmail: true,
      },
    });
    if (!currentUser) {
      return NextResponse.json({ error: "Kullanici bulunamadi." }, { status: 404 });
    }

    if (
      normalizedEmail !== undefined &&
      !areEmailsEqual(currentUser.email, sanitizedEmail ?? null)
    ) {
      const existingEmailUser = await prisma.user.findUnique({
        where: { normalizedEmail },
        select: { id: true },
      });
      if (existingEmailUser && existingEmailUser.id !== sessionUser.id) {
        return NextResponse.json({ error: "Bu e-posta adresi zaten kullaniliyor." }, { status: 409 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (normalizedEmail !== undefined && !areEmailsEqual(currentUser.email, sanitizedEmail ?? null)) {
        await tx.user.update({
          where: { id: sessionUser.id },
          data: {
            email: sanitizedEmail,
            normalizedEmail,
            emailVerifiedAt: null,
          },
        });
      }

      return tx.userProfile.update({
        where: { userId: sessionUser.id },
        data: {
          ...(parsed.displayName !== undefined ? { displayName: parsed.displayName } : {}),
          ...(parsed.bio !== undefined ? { bio: parsed.bio } : {}),
        },
        include: {
          avatarItem: true,
          frameItem: true,
          cardBackItem: true,
          cardFaceItem: true,
        },
      });
    });

    await writeAuditLog({
      actor: sessionUser,
      action: "user.profile.update",
      resourceType: "user_profile",
      resourceId: sessionUser.id,
      summary: `Updated user profile ${sessionUser.id}`,
      metadata: {
        hasDisplayName: updated.displayName !== null,
        hasBio: updated.bio !== null,
        hasEmail: normalizedEmail !== undefined ? true : currentUser.email !== null,
        emailChanged: normalizedEmail !== undefined && !areEmailsEqual(currentUser.email, sanitizedEmail ?? null),
      },
      request: req,
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Gecersiz veri." }, { status: 422 });
    }
    return NextResponse.json({ error: "Profil guncellenemedi." }, { status: 500 });
  }
}
