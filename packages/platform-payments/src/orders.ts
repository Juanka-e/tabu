import { createHash, randomUUID } from "node:crypto";
import { Prisma, prisma, type PaymentOrder } from "@hushle/platform-db";
import { z } from "zod";
import {
    PAYMENT_PROVIDER_IDS,
    paymentOrderQuoteSchema,
    type CreatePaymentOrderInput,
    type PaymentOrderCreationResult,
    type PaymentOrderQuote,
} from "./contracts";

const createOrderInputSchema = z.object({
    userId: z.number().int().positive(),
    provider: z.enum(PAYMENT_PROVIDER_IDS),
    providerConfigVersion: z.number().int().min(1).max(2_147_483_647),
    idempotencyKey: z.string().trim().min(16).max(128).regex(/^[A-Za-z0-9._:-]+$/),
    quote: paymentOrderQuoteSchema,
    expiresAt: z.date().nullable().optional(),
});

export class PaymentOrderConflictError extends Error {
    constructor(
        public readonly code:
            | "idempotency_payload_mismatch"
            | "idempotency_race_unresolved"
    ) {
        super(code);
        this.name = "PaymentOrderConflictError";
    }
}

function canonicalize(value: unknown): unknown {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new TypeError("Payment snapshots require finite numbers");
        return value;
    }
    if (Array.isArray(value)) return value.map(canonicalize);
    if (typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, nested]) => [key, canonicalize(nested)])
        );
    }
    throw new TypeError("Payment snapshots must be JSON serializable");
}

export function normalizePaymentOrderQuote(input: PaymentOrderQuote): PaymentOrderQuote & {
    totalAmountMinor: number;
} {
    const quote = paymentOrderQuoteSchema.parse(input);
    const totalAmountMinor = quote.quantity * quote.unitAmountMinor;
    if (!Number.isSafeInteger(totalAmountMinor) || totalAmountMinor > 2_147_483_647) {
        throw new RangeError("Payment total exceeds the supported minor-unit range");
    }

    return {
        ...quote,
        currency: quote.currency.toUpperCase(),
        grantSnapshot: canonicalize(quote.grantSnapshot) as Record<string, unknown>,
        totalAmountMinor,
    };
}

export function fingerprintPaymentOrderRequest(input: {
    provider: string;
    providerConfigVersion: number;
    quote: PaymentOrderQuote;
}): string {
    const quote = normalizePaymentOrderQuote(input.quote);
    return createHash("sha256")
        .update(JSON.stringify(canonicalize({
            provider: input.provider,
            providerConfigVersion: input.providerConfigVersion,
            quote,
        })))
        .digest("hex");
}

async function resolveExistingOrder(
    userId: number,
    idempotencyKey: string,
    requestFingerprint: string
) {
    const existing = await prisma.paymentOrder.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });
    if (!existing) return null;
    if (existing.requestFingerprint !== requestFingerprint) {
        throw new PaymentOrderConflictError("idempotency_payload_mismatch");
    }
    return existing;
}

export async function createPaymentOrderRecord(
    input: CreatePaymentOrderInput
): Promise<PaymentOrderCreationResult<PaymentOrder>> {
    const parsed = createOrderInputSchema.parse(input);
    const quote = normalizePaymentOrderQuote(parsed.quote);
    const requestFingerprint = fingerprintPaymentOrderRequest(parsed);
    const existing = await resolveExistingOrder(
        parsed.userId,
        parsed.idempotencyKey,
        requestFingerprint
    );
    if (existing) return { order: existing, reused: true };

    const candidateId = randomUUID();
    const inserted = await prisma.paymentOrder.createMany({
        data: [
            {
                id: candidateId,
                userId: parsed.userId,
                provider: parsed.provider,
                providerConfigVersion: parsed.providerConfigVersion,
                idempotencyKey: parsed.idempotencyKey,
                requestFingerprint,
                productKind: quote.productKind,
                productReference: quote.productReference,
                productVersion: quote.productVersion,
                productNameSnapshot: quote.productName,
                quantity: quote.quantity,
                unitAmountMinor: quote.unitAmountMinor,
                totalAmountMinor: quote.totalAmountMinor,
                currency: quote.currency,
                grantSnapshot: quote.grantSnapshot as Prisma.InputJsonValue,
                expiresAt: parsed.expiresAt,
            },
        ],
        skipDuplicates: true,
    });
    const order = await resolveExistingOrder(
        parsed.userId,
        parsed.idempotencyKey,
        requestFingerprint
    );
    if (!order) {
        throw new PaymentOrderConflictError("idempotency_race_unresolved");
    }
    return { order, reused: inserted.count === 0 };
}
