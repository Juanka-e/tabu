import { Prisma, prisma } from "@hushle/platform-db";
import { z } from "zod";

const EMAIL_MAX_LENGTH = 191;

const profilePatchSchema = z
    .object({
        displayName: z.preprocess(
            (value) => {
                if (typeof value !== "string") return value;
                const trimmed = value.trim();
                return trimmed.length === 0 ? null : trimmed;
            },
            z.string().trim().min(1).max(60).nullable().optional()
        ),
        bio: z.string().trim().max(300).optional(),
        email: z.preprocess(
            (value) => {
                if (typeof value !== "string") return value;
                const trimmed = value.trim();
                return trimmed.length === 0 ? undefined : trimmed;
            },
            z.email().max(EMAIL_MAX_LENGTH).optional()
        ),
    })
    .refine(
        (value) =>
            value.displayName !== undefined ||
            value.bio !== undefined ||
            value.email !== undefined,
        { message: "At least one profile field is required." }
    );

export type PlayerProfilePatch = z.infer<typeof profilePatchSchema>;

export type PlayerAuditContext = {
    actorRole: string;
    ipAddress?: string | null;
    userAgent?: string | null;
};

export type PlayerCoreView = {
    id: number;
    username: string;
    email: string | null;
    emailVerifiedAt: string | null;
    wallet: {
        coinBalance: number;
    };
    profile: {
        displayName: string | null;
        bio: string | null;
        avatarItemId: number | null;
        frameItemId: number | null;
        cardBackItemId: number | null;
        cardFaceItemId: number | null;
    };
};

export class PlayerCoreError extends Error {
    constructor(
        public readonly code:
            | "invalid_profile"
            | "email_conflict"
            | "user_not_found",
        message: string = code
    ) {
        super(message);
        this.name = "PlayerCoreError";
    }
}

export function parsePlayerProfilePatch(input: unknown): PlayerProfilePatch {
    const parsed = profilePatchSchema.safeParse(input);
    if (!parsed.success) {
        throw new PlayerCoreError(
            "invalid_profile",
            parsed.error.issues[0]?.message ?? "Profile payload is invalid."
        );
    }
    return parsed.data;
}

function normalizeEmail(email: string): string {
    return email.trim().toLocaleLowerCase("en-US");
}

function emailsEqual(left: string | null, right: string | null): boolean {
    if (!left && !right) return true;
    if (!left || !right) return false;
    return normalizeEmail(left) === normalizeEmail(right);
}

export async function getPlayerCore(userId: number): Promise<PlayerCoreView> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            emailVerifiedAt: true,
            wallet: { select: { coinBalance: true } },
            profile: {
                select: {
                    displayName: true,
                    bio: true,
                    avatarItemId: true,
                    frameItemId: true,
                    cardBackItemId: true,
                    cardFaceItemId: true,
                },
            },
        },
    });
    if (!user) throw new PlayerCoreError("user_not_found");

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        wallet: {
            coinBalance: user.wallet?.coinBalance ?? 0,
        },
        profile: {
            displayName: user.profile?.displayName ?? null,
            bio: user.profile?.bio ?? null,
            avatarItemId: user.profile?.avatarItemId ?? null,
            frameItemId: user.profile?.frameItemId ?? null,
            cardBackItemId: user.profile?.cardBackItemId ?? null,
            cardFaceItemId: user.profile?.cardFaceItemId ?? null,
        },
    };
}

function buildAuditData(input: {
    userId: number;
    role: string;
    action: string;
    summary: string;
    metadata: Prisma.InputJsonObject;
    context: PlayerAuditContext;
}): Prisma.AuditLogCreateManyInput {
    return {
        actorUserId: input.userId,
        actorRole: input.role.slice(0, 20),
        action: input.action.slice(0, 80),
        resourceType: "user_profile",
        resourceId: String(input.userId),
        ipAddress: input.context.ipAddress?.slice(0, 64) || null,
        userAgent: input.context.userAgent?.slice(0, 255) || null,
        summary: input.summary.slice(0, 255),
        metadata: input.metadata,
    };
}

export async function updatePlayerProfile(input: {
    userId: number;
    patch: unknown;
    auditContext: PlayerAuditContext;
}) {
    const patch = parsePlayerProfilePatch(input.patch);
    const sanitizedEmail =
        patch.email !== undefined ? patch.email.trim() : undefined;
    const normalizedEmail =
        sanitizedEmail !== undefined
            ? normalizeEmail(sanitizedEmail)
            : undefined;

    const currentUser = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
            email: true,
            username: true,
            profile: { select: { displayName: true } },
        },
    });
    if (!currentUser) throw new PlayerCoreError("user_not_found");

    const emailChanged =
        normalizedEmail !== undefined &&
        !emailsEqual(currentUser.email, sanitizedEmail ?? null);
    if (emailChanged) {
        const owner = await prisma.user.findUnique({
            where: { normalizedEmail },
            select: { id: true },
        });
        if (owner && owner.id !== input.userId) {
            throw new PlayerCoreError("email_conflict");
        }
    }

    const requestedDisplayName =
        patch.displayName === undefined
            ? undefined
            : patch.displayName?.trim() ?? null;
    const previousDisplayName =
        currentUser.profile?.displayName?.trim() ?? null;
    const displayNameChanged =
        requestedDisplayName !== undefined &&
        requestedDisplayName !== previousDisplayName;

    try {
        const profile = await prisma.$transaction(async (tx) => {
            if (emailChanged) {
                await tx.user.update({
                    where: { id: input.userId },
                    data: {
                        email: sanitizedEmail,
                        normalizedEmail,
                        emailVerifiedAt: null,
                    },
                });
            }

            const updated = await tx.userProfile.upsert({
                where: { userId: input.userId },
                create: {
                    userId: input.userId,
                    ...(patch.displayName !== undefined
                        ? { displayName: patch.displayName }
                        : {}),
                    ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
                },
                update: {
                    ...(patch.displayName !== undefined
                        ? { displayName: patch.displayName }
                        : {}),
                    ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
                },
                include: {
                    avatarItem: true,
                    frameItem: true,
                    cardBackItem: true,
                    cardFaceItem: true,
                },
            });

            const auditRows: Prisma.AuditLogCreateManyInput[] = [
                buildAuditData({
                    userId: input.userId,
                    role: input.auditContext.actorRole,
                    action: "user.profile.update",
                    summary: `Updated user profile ${input.userId}`,
                    metadata: {
                        hasDisplayName: updated.displayName !== null,
                        hasBio: updated.bio !== null,
                        hasEmail:
                            normalizedEmail !== undefined
                                ? true
                                : currentUser.email !== null,
                        emailChanged,
                    },
                    context: input.auditContext,
                }),
            ];
            if (displayNameChanged) {
                auditRows.push(
                    buildAuditData({
                        userId: input.userId,
                        role: input.auditContext.actorRole,
                        action: "user.profile.display_name_update",
                        summary: `Updated display name for user ${currentUser.username}`,
                        metadata: {
                            previousDisplayName,
                            nextDisplayName: updated.displayName,
                        },
                        context: input.auditContext,
                    })
                );
            }
            await tx.auditLog.createMany({ data: auditRows });
            return updated;
        });

        return {
            profile,
            changes: { emailChanged, displayNameChanged },
        };
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            throw new PlayerCoreError("email_conflict");
        }
        throw error;
    }
}
