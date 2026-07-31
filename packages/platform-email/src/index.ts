import {
    createHash,
    createHmac,
    randomUUID,
    timingSafeEqual,
} from "node:crypto";
import nodemailer from "nodemailer";
import {
    EmailMessageClass,
    EmailOutboxStatus,
    Prisma,
    prisma,
} from "@hushle/platform-db";

export const EMAIL_VERIFICATION_MODES = [
    "off",
    "optional",
    "required_for_new_accounts",
] as const;
export type EmailVerificationMode =
    (typeof EMAIL_VERIFICATION_MODES)[number];

export const EMAIL_MESSAGE_CLASSES = [
    "transactional",
    "marketing",
] as const;

export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60_000;
export const EMAIL_OUTBOX_MAX_ATTEMPTS = 5;

const EMAIL_VERIFICATION_TEMPLATE = "email_verification";
const TOKEN_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type EmailEnvironment = Record<string, string | undefined>;

class EmailVerificationConflict extends Error {}

export interface EmailProviderReadiness {
    provider: "disabled" | "smtp";
    configured: boolean;
    issues: string[];
}

export interface TransactionalEmailMessage {
    to: string;
    subject: string;
    text: string;
    html: string;
    headers?: Record<string, string>;
}

export interface TransactionalEmailProvider {
    send(message: TransactionalEmailMessage): Promise<void>;
    close?(): void | Promise<void>;
}

function normalizeProvider(
    value: string | undefined
): EmailProviderReadiness["provider"] {
    return value?.trim().toLowerCase() === "smtp" ? "smtp" : "disabled";
}

function parsePort(value: string | undefined): number | null {
    if (!value?.trim()) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65_535
        ? parsed
        : null;
}

function isValidBaseUrl(value: string | undefined): boolean {
    if (!value?.trim()) return false;
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

export function getEmailProviderReadiness(
    env: EmailEnvironment = process.env
): EmailProviderReadiness {
    const provider = normalizeProvider(env.EMAIL_PROVIDER);
    if (provider === "disabled") {
        return {
            provider,
            configured: false,
            issues: ["EMAIL_PROVIDER is disabled"],
        };
    }

    const issues: string[] = [];
    if (!env.SMTP_HOST?.trim()) issues.push("SMTP_HOST is missing");
    if (!parsePort(env.SMTP_PORT)) issues.push("SMTP_PORT is invalid");
    if (!env.EMAIL_FROM?.trim()) issues.push("EMAIL_FROM is missing");
    if (Boolean(env.SMTP_USER?.trim()) !== Boolean(env.SMTP_PASS)) {
        issues.push("SMTP_USER and SMTP_PASS must be configured together");
    }
    if (!isValidBaseUrl(env.NEXT_PUBLIC_SITE_URL)) {
        issues.push("NEXT_PUBLIC_SITE_URL is invalid");
    }
    if (!env.EMAIL_TOKEN_SECRET || env.EMAIL_TOKEN_SECRET.trim().length < 32) {
        issues.push("EMAIL_TOKEN_SECRET must contain at least 32 characters");
    }

    return {
        provider,
        configured: issues.length === 0,
        issues,
    };
}

function parseBoolean(value: string | undefined): boolean {
    return value?.trim().toLowerCase() === "true";
}

export function createSmtpEmailProvider(
    env: EmailEnvironment = process.env
): TransactionalEmailProvider {
    const readiness = getEmailProviderReadiness(env);
    if (!readiness.configured || readiness.provider !== "smtp") {
        throw new Error(
            `Email provider is not ready: ${readiness.issues.join(", ")}`
        );
    }

    const port = parsePort(env.SMTP_PORT);
    if (!port) throw new Error("SMTP_PORT is invalid");

    const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST?.trim(),
        port,
        secure: parseBoolean(env.SMTP_SECURE),
        auth:
            env.SMTP_USER?.trim() && env.SMTP_PASS
                ? {
                      user: env.SMTP_USER.trim(),
                      pass: env.SMTP_PASS,
                  }
                : undefined,
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
    });
    const from = env.EMAIL_FROM?.trim() ?? "";

    return {
        async send(message) {
            await transporter.sendMail({
                from,
                ...message,
            });
        },
        close() {
            transporter.close();
        },
    };
}

function requireTokenSecret(env: EmailEnvironment): string {
    const secret = env.EMAIL_TOKEN_SECRET?.trim();
    if (!secret || secret.length < 32) {
        throw new Error(
            "EMAIL_TOKEN_SECRET must contain at least 32 characters"
        );
    }
    return secret;
}

function deriveVerificationToken(
    tokenId: string,
    env: EmailEnvironment
): string {
    const signature = createHmac("sha256", requireTokenSecret(env))
        .update(`email-verification:${tokenId}`, "utf8")
        .digest("base64url");
    return `${tokenId}.${signature}`;
}

export function hashEmailVerificationToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
}

function parseVerificationTokenId(token: string): string | null {
    if (token.length > 160) return null;
    const separator = token.indexOf(".");
    if (separator <= 0) return null;
    const tokenId = token.slice(0, separator);
    return TOKEN_ID_PATTERN.test(tokenId) ? tokenId : null;
}

function hashesEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");
    return (
        leftBuffer.length === rightBuffer.length &&
        timingSafeEqual(leftBuffer, rightBuffer)
    );
}

export async function enqueueEmailVerification(
    tx: Prisma.TransactionClient,
    input: {
        userId: number;
        email: string;
        siteName: string;
        now?: Date;
        ttlMs?: number;
        env?: EmailEnvironment;
    }
): Promise<{ tokenId: string; expiresAt: Date; outboxId: string }> {
    const now = input.now ?? new Date();
    const ttlMs = input.ttlMs ?? EMAIL_VERIFICATION_TOKEN_TTL_MS;
    const tokenId = randomUUID();
    const outboxId = randomUUID();
    const expiresAt = new Date(now.getTime() + ttlMs);
    const rawToken = deriveVerificationToken(
        tokenId,
        input.env ?? process.env
    );

    await tx.emailVerificationToken.updateMany({
        where: {
            userId: input.userId,
            consumedAt: null,
            revokedAt: null,
        },
        data: { revokedAt: now },
    });
    await tx.emailOutboxMessage.updateMany({
        where: {
            userId: input.userId,
            template: EMAIL_VERIFICATION_TEMPLATE,
            status: EmailOutboxStatus.pending,
        },
        data: {
            status: EmailOutboxStatus.dead_letter,
            lastError: "Superseded by a newer verification request",
        },
    });
    await tx.emailVerificationToken.create({
        data: {
            id: tokenId,
            userId: input.userId,
            tokenHash: hashEmailVerificationToken(rawToken),
            emailSnapshot: input.email,
            expiresAt,
        },
    });
    await tx.emailOutboxMessage.create({
        data: {
            id: outboxId,
            userId: input.userId,
            deduplicationKey: `email-verification:${tokenId}`,
            messageClass: EmailMessageClass.transactional,
            template: EMAIL_VERIFICATION_TEMPLATE,
            recipient: input.email,
            subject: `${input.siteName} e-posta doğrulaması`,
            payload: {
                verificationTokenId: tokenId,
                siteName: input.siteName,
            },
        },
    });

    return { tokenId, expiresAt, outboxId };
}

export async function requestEmailVerification(input: {
    userId: number;
    siteName: string;
    env?: EmailEnvironment;
    now?: Date;
}): Promise<"queued" | "already_verified" | "email_missing"> {
    const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
            id: true,
            email: true,
            emailVerifiedAt: true,
        },
    });
    if (!user?.email) return "email_missing";
    if (user.emailVerifiedAt) return "already_verified";

    await prisma.$transaction((tx) =>
        enqueueEmailVerification(tx, {
            userId: user.id,
            email: user.email!,
            siteName: input.siteName,
            env: input.env,
            now: input.now,
        })
    );
    return "queued";
}

export async function confirmEmailVerification(input: {
    token: string;
    env?: EmailEnvironment;
    now?: Date;
}): Promise<
    | { ok: true; userId: number }
    | {
          ok: false;
          reason: "invalid" | "expired" | "used" | "email_changed";
      }
> {
    const tokenId = parseVerificationTokenId(input.token);
    if (!tokenId) return { ok: false, reason: "invalid" };

    const record = await prisma.emailVerificationToken.findUnique({
        where: { id: tokenId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                },
            },
        },
    });
    if (!record) return { ok: false, reason: "invalid" };

    const candidateHash = hashEmailVerificationToken(input.token);
    if (!hashesEqual(candidateHash, record.tokenHash)) {
        return { ok: false, reason: "invalid" };
    }
    const now = input.now ?? new Date();
    if (record.consumedAt || record.revokedAt) {
        return { ok: false, reason: "used" };
    }
    if (record.expiresAt.getTime() <= now.getTime()) {
        return { ok: false, reason: "expired" };
    }
    if (
        !record.user.email ||
        record.user.email.trim().toLowerCase() !==
            record.emailSnapshot.trim().toLowerCase()
    ) {
        return { ok: false, reason: "email_changed" };
    }

    let consumed = false;
    try {
        consumed = await prisma.$transaction(async (tx) => {
            const tokenResult = await tx.emailVerificationToken.updateMany({
                where: {
                    id: record.id,
                    tokenHash: record.tokenHash,
                    consumedAt: null,
                    revokedAt: null,
                    expiresAt: { gt: now },
                },
                data: { consumedAt: now },
            });
            if (tokenResult.count !== 1) {
                throw new EmailVerificationConflict();
            }

            const userResult = await tx.user.updateMany({
                where: {
                    id: record.userId,
                    email: record.emailSnapshot,
                    emailVerifiedAt: null,
                },
                data: {
                    emailVerifiedAt: now,
                    accountStatus: "active",
                },
            });
            if (userResult.count !== 1) {
                throw new EmailVerificationConflict();
            }

            await tx.emailVerificationToken.updateMany({
                where: {
                    userId: record.userId,
                    id: { not: record.id },
                    consumedAt: null,
                    revokedAt: null,
                },
                data: { revokedAt: now },
            });
            return true;
        });
    } catch (error) {
        if (!(error instanceof EmailVerificationConflict)) throw error;
    }
    return consumed
        ? { ok: true, userId: record.userId }
        : { ok: false, reason: "used" };
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function buildVerificationMessage(input: {
    recipient: string;
    subject: string;
    siteName: string;
    verificationUrl: string;
}): TransactionalEmailMessage {
    const siteName = escapeHtml(input.siteName);
    const verificationUrl = escapeHtml(input.verificationUrl);
    return {
        to: input.recipient,
        subject: input.subject,
        text: `${input.siteName} hesabını doğrulamak için bağlantıyı aç: ${input.verificationUrl}\n\nBu isteği sen yapmadıysan e-postayı yok sayabilirsin.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#172033"><h1 style="font-size:24px">${siteName}</h1><p>E-posta adresini doğrulamak için aşağıdaki bağlantıyı aç.</p><p><a href="${verificationUrl}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">E-postamı doğrula</a></p><p style="font-size:13px;color:#64748b">Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.</p></div>`,
    };
}

function retryDelayMs(attemptCount: number): number {
    return Math.min(6 * 60 * 60_000, 60_000 * 2 ** attemptCount);
}

function deliveryErrorLabel(error: unknown): string {
    const name =
        error instanceof Error && error.name.trim()
            ? error.name.trim().slice(0, 80)
            : "UnknownError";
    return `Delivery failed (${name})`;
}

export interface EmailDeliveryResult {
    selected: number;
    sent: number;
    retried: number;
    deadLettered: number;
}

export async function processEmailOutbox(input: {
    provider: TransactionalEmailProvider;
    env?: EmailEnvironment;
    now?: Date;
    batchSize?: number;
}): Promise<EmailDeliveryResult> {
    const env = input.env ?? process.env;
    const now = input.now ?? new Date();
    const batchSize = Math.max(1, Math.min(100, input.batchSize ?? 25));
    const messages = await prisma.emailOutboxMessage.findMany({
        where: {
            status: EmailOutboxStatus.pending,
            availableAt: { lte: now },
        },
        orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
        take: batchSize,
    });

    const result: EmailDeliveryResult = {
        selected: messages.length,
        sent: 0,
        retried: 0,
        deadLettered: 0,
    };

    for (const message of messages) {
        if (message.messageClass !== EmailMessageClass.transactional) {
            await prisma.emailOutboxMessage.update({
                where: { id: message.id },
                data: {
                    status: EmailOutboxStatus.dead_letter,
                    lastAttemptAt: now,
                    lastError:
                        "Marketing delivery is disabled until consent enforcement exists",
                },
            });
            result.deadLettered += 1;
            continue;
        }

        try {
            if (message.template !== EMAIL_VERIFICATION_TEMPLATE) {
                throw new TypeError("Unsupported transactional template");
            }
            const payload = message.payload as {
                verificationTokenId?: unknown;
                siteName?: unknown;
            };
            if (
                typeof payload.verificationTokenId !== "string" ||
                typeof payload.siteName !== "string"
            ) {
                throw new TypeError("Invalid email verification payload");
            }
            const tokenRecord =
                await prisma.emailVerificationToken.findUnique({
                    where: { id: payload.verificationTokenId },
                });
            if (
                !tokenRecord ||
                tokenRecord.consumedAt ||
                tokenRecord.revokedAt ||
                tokenRecord.expiresAt.getTime() <= now.getTime() ||
                tokenRecord.emailSnapshot !== message.recipient
            ) {
                throw new TypeError("Email verification token is unavailable");
            }

            const token = deriveVerificationToken(tokenRecord.id, env);
            const baseUrl = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
            if (!baseUrl) throw new TypeError("Public site URL is unavailable");
            const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
            await input.provider.send(
                buildVerificationMessage({
                    recipient: message.recipient,
                    subject: message.subject,
                    siteName: payload.siteName,
                    verificationUrl,
                })
            );
            await prisma.emailOutboxMessage.update({
                where: { id: message.id },
                data: {
                    status: EmailOutboxStatus.sent,
                    sentAt: now,
                    lastAttemptAt: now,
                    attemptCount: { increment: 1 },
                    lastError: null,
                },
            });
            result.sent += 1;
        } catch (error) {
            const nextAttemptCount = message.attemptCount + 1;
            const deadLetter =
                nextAttemptCount >= EMAIL_OUTBOX_MAX_ATTEMPTS ||
                error instanceof TypeError;
            await prisma.emailOutboxMessage.update({
                where: { id: message.id },
                data: {
                    status: deadLetter
                        ? EmailOutboxStatus.dead_letter
                        : EmailOutboxStatus.pending,
                    attemptCount: nextAttemptCount,
                    lastAttemptAt: now,
                    availableAt: deadLetter
                        ? message.availableAt
                        : new Date(
                              now.getTime() +
                                  retryDelayMs(nextAttemptCount - 1)
                          ),
                    lastError: deliveryErrorLabel(error),
                },
            });
            if (deadLetter) result.deadLettered += 1;
            else result.retried += 1;
        }
    }

    return result;
}
