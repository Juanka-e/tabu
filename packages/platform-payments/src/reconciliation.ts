import { Prisma, prisma, type PaymentOrder, type PaymentProvider } from "@hushle/platform-db";
import type { IyzicoCredentials } from "./adapters/iyzico";
import {
    PaytrAdapterError,
    queryPaytrPaymentStatus,
    type PaytrCredentials,
    type PaytrStatusQueryResult,
} from "./adapters/paytr";
import { fulfillPaidPaymentOrder } from "./fulfillment";
import {
    IyzicoCheckoutError,
    verifyIyzicoSandboxCheckoutResult,
} from "./iyzico-checkout";
import { assertPaymentOrderTransition } from "./order-state-machine";
import {
    createPaymentFulfillmentNotification,
    invalidatePaymentFulfillmentCaches,
} from "./fulfillment-effects";

export interface PaymentReconciliationConfig {
    batchSize: number;
    minAgeMinutes: number;
    retryDelayMinutes: number;
    maxAttempts: number;
}

export type PaytrStatusQuery = (input: {
    merchantOrderId: string;
    credentials: PaytrCredentials;
}) => Promise<PaytrStatusQueryResult>;

function paytrCredentialsFromEnvironment(
    environment: Readonly<Record<string, string | undefined>>
): PaytrCredentials {
    return {
        merchantId: environment.PAYTR_MERCHANT_ID ?? "",
        merchantKey: environment.PAYTR_MERCHANT_KEY ?? "",
        merchantSalt: environment.PAYTR_MERCHANT_SALT ?? "",
    };
}

function iyzicoCredentialsFromEnvironment(
    environment: Readonly<Record<string, string | undefined>>
): IyzicoCredentials {
    return {
        apiKey: environment.IYZICO_API_KEY ?? "",
        secretKey: environment.IYZICO_SECRET_KEY ?? "",
    };
}

function isIyzicoReconciliationEnabled(
    environment: Readonly<Record<string, string | undefined>>
): boolean {
    return environment.IYZICO_CHECKOUT_MODE?.trim().toLowerCase() === "sandbox"
        && environment.IYZICO_RECONCILIATION_MODE?.trim().toLowerCase() === "sandbox";
}

async function upsertCase(input: {
    orderId: string;
    reasonCode: string;
    snapshot?: Prisma.InputJsonValue;
    errorCode?: string;
    now: Date;
    retryDelayMinutes: number;
}): Promise<void> {
    const nextCheckAt = new Date(input.now.getTime() + input.retryDelayMinutes * 60_000);
    await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
            SELECT id FROM payment_orders WHERE id = ${input.orderId} FOR UPDATE
        `);
        if (rows.length !== 1) return;
        await tx.paymentReconciliationCase.upsert({
            where: { orderId: input.orderId },
            create: {
                orderId: input.orderId,
                status: "open",
                reasonCode: input.reasonCode,
                attemptCount: 1,
                providerSnapshot: input.snapshot,
                lastErrorCode: input.errorCode,
                lastCheckedAt: input.now,
                nextCheckAt,
            },
            update: {
                status: "open",
                reasonCode: input.reasonCode,
                attemptCount: { increment: 1 },
                providerSnapshot: input.snapshot,
                lastErrorCode: input.errorCode,
                lastCheckedAt: input.now,
                nextCheckAt,
                resolvedAt: null,
                resolvedByUserId: null,
                resolutionNote: null,
            },
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

async function markPaid(order: PaymentOrder, now: Date): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
            SELECT id FROM payment_orders WHERE id = ${order.id} FOR UPDATE
        `);
        if (rows.length !== 1) return false;
        const current = await tx.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
        if (current.status === "paid" || current.status === "fulfilled") return false;
        if (current.status !== "awaiting_payment") return false;
        assertPaymentOrderTransition(current.status, "paid");
        await tx.paymentOrder.update({
            where: { id: current.id },
            data: {
                status: "paid",
                paidAt: now,
                providerSessionReference: null,
                providerHostedUrl: null,
                version: { increment: 1 },
            },
        });
        await tx.paymentReconciliationCase.upsert({
            where: { orderId: current.id },
            create: {
                orderId: current.id,
                status: "resolved",
                reasonCode: "provider_paid",
                attemptCount: 1,
                lastCheckedAt: now,
                resolvedAt: now,
                resolutionNote: "provider_status_confirmed_paid",
            },
            update: {
                status: "resolved",
                reasonCode: "provider_paid",
                attemptCount: { increment: 1 },
                lastErrorCode: null,
                lastCheckedAt: now,
                nextCheckAt: null,
                resolvedAt: now,
                resolutionNote: "provider_status_confirmed_paid",
            },
        });
        return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

async function resolveCase(orderId: string, now: Date, note: string): Promise<void> {
    await prisma.paymentReconciliationCase.upsert({
        where: { orderId },
        create: {
            orderId,
            status: "resolved",
            reasonCode: "provider_paid",
            attemptCount: 1,
            lastCheckedAt: now,
            resolvedAt: now,
            resolutionNote: note,
        },
        update: {
            status: "resolved",
            reasonCode: "provider_paid",
            attemptCount: { increment: 1 },
            lastErrorCode: null,
            lastCheckedAt: now,
            nextCheckAt: null,
            resolvedAt: now,
            resolutionNote: note,
        },
    });
}

async function finishVerifiedOrder(
    order: PaymentOrder,
    now: Date,
    provider: PaymentProvider
): Promise<"fulfilled" | "unchanged"> {
    if (order.status === "paid") {
        await fulfillPaidPaymentOrder({ orderId: order.id, now });
    } else if (order.status !== "fulfilled") {
        return "unchanged";
    }
    const userId = await createPaymentFulfillmentNotification(order.id, now, provider);
    await invalidatePaymentFulfillmentCaches(userId);
    await resolveCase(order.id, now, "fulfillment_and_notification_completed");
    return "fulfilled";
}

function snapshot(result: Extract<PaytrStatusQueryResult, { status: "success" }>) {
    return {
        schemaVersion: 1,
        paymentAmountMinor: result.paymentAmountMinor,
        paymentTotalMinor: result.paymentTotalMinor,
        currency: result.currency,
        testMode: result.testMode,
        returnCount: result.returnCount,
    } satisfies Prisma.InputJsonValue;
}

export async function reconcilePaytrOrder(input: {
    order: PaymentOrder;
    credentials: PaytrCredentials;
    query?: PaytrStatusQuery;
    now: Date;
    retryDelayMinutes: number;
}): Promise<"fulfilled" | "review" | "unchanged"> {
    if (input.order.status === "paid" || input.order.status === "fulfilled") {
        return finishVerifiedOrder(input.order, input.now, "paytr");
    }
    const reference = input.order.providerOrderReference;
    if (!reference) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "provider_reference_missing",
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }

    let result: PaytrStatusQueryResult;
    try {
        result = await (input.query ?? queryPaytrPaymentStatus)({
            merchantOrderId: reference,
            credentials: input.credentials,
        });
    } catch (error) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "provider_query_failed",
            errorCode: error instanceof PaytrAdapterError ? error.code : "provider_unavailable",
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }

    if (result.status === "error") {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "provider_order_not_confirmed",
            errorCode: result.errorCode,
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }
    const providerSnapshot = snapshot(result);
    const mismatch = result.paymentAmountMinor !== input.order.totalAmountMinor
        || result.currency !== input.order.currency.toUpperCase()
        || result.testMode !== true;
    if (mismatch || result.returnCount > 0) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: result.returnCount > 0 ? "provider_return_detected" : "provider_payment_mismatch",
            snapshot: providerSnapshot,
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }

    const transitioned = await markPaid(input.order, input.now);
    if (!transitioned) return "unchanged";
    return finishVerifiedOrder({ ...input.order, status: "paid", paidAt: input.now }, input.now, "paytr");
}

export type IyzicoCheckoutVerification = (input: {
    orderId: string;
    token: string;
    credentials: IyzicoCredentials;
    now?: Date;
}) => Promise<{
    orderId: string;
    providerPaymentReference: string;
    paymentStatus: string;
    fraudStatus: number;
    providerReportedSuccess: boolean;
}>;

function iyzicoSnapshot(result: Awaited<ReturnType<IyzicoCheckoutVerification>>): Prisma.InputJsonValue {
    return {
        schemaVersion: 1,
        providerPaymentReference: result.providerPaymentReference,
        paymentStatus: result.paymentStatus,
        fraudStatus: result.fraudStatus,
    };
}

async function hasExactIyzicoProof(
    order: PaymentOrder,
    expectedPaymentReference?: string
): Promise<boolean> {
    const proof = await prisma.paymentCheckoutVerification.findUnique({ where: { orderId: order.id } });
    return Boolean(
        proof
        && proof.provider === "iyzico"
        && (!expectedPaymentReference || proof.providerPaymentReference === expectedPaymentReference)
        && proof.amountMinor === order.totalAmountMinor
        && proof.paidAmountMinor === order.totalAmountMinor
        && proof.currency.toUpperCase() === order.currency.toUpperCase()
        && proof.providerPaymentStatus === "SUCCESS"
        && proof.providerRiskStatus === 1
    );
}

export async function reconcileIyzicoOrder(input: {
    order: PaymentOrder;
    credentials: IyzicoCredentials;
    verify?: IyzicoCheckoutVerification;
    now: Date;
    retryDelayMinutes: number;
}): Promise<"fulfilled" | "review" | "unchanged"> {
    if (input.order.provider !== "iyzico") return "unchanged";
    if (input.order.status === "paid" || input.order.status === "fulfilled") {
        if (!await hasExactIyzicoProof(input.order)) {
            await upsertCase({
                orderId: input.order.id,
                reasonCode: "provider_proof_missing",
                errorCode: "iyzico_exact_proof_required",
                now: input.now,
                retryDelayMinutes: input.retryDelayMinutes,
            });
            return "review";
        }
        return finishVerifiedOrder(input.order, input.now, "iyzico");
    }
    if (input.order.status !== "awaiting_payment" && input.order.status !== "pending_provider") {
        return "unchanged";
    }
    if (!input.order.providerSessionReference) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "iyzico_initialize_uncertain_manual_review",
            errorCode: "provider_session_missing",
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }

    let verification: Awaited<ReturnType<IyzicoCheckoutVerification>>;
    try {
        verification = await (input.verify ?? verifyIyzicoSandboxCheckoutResult)({
            orderId: input.order.id,
            token: input.order.providerSessionReference,
            credentials: input.credentials,
            now: input.now,
        });
    } catch (error) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "provider_query_failed",
            errorCode: error instanceof IyzicoCheckoutError ? error.code : "provider_unavailable",
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }
    if (!verification.providerReportedSuccess) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "provider_payment_not_approved",
            snapshot: iyzicoSnapshot(verification),
            errorCode: verification.paymentStatus === "SUCCESS"
                ? "provider_risk_pending"
                : "provider_payment_failed",
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }
    if (!await hasExactIyzicoProof(input.order, verification.providerPaymentReference)) {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "provider_proof_missing",
            snapshot: iyzicoSnapshot(verification),
            errorCode: "iyzico_exact_proof_required",
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }
    if (input.order.status === "pending_provider") {
        await upsertCase({
            orderId: input.order.id,
            reasonCode: "checkout_state_conflict",
            snapshot: iyzicoSnapshot(verification),
            errorCode: "pending_provider_with_payment_proof",
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
        return "review";
    }

    const transitioned = await markPaid(input.order, input.now);
    if (transitioned) {
        return finishVerifiedOrder(
            { ...input.order, status: "paid", paidAt: input.now },
            input.now,
            "iyzico"
        );
    }
    const current = await prisma.paymentOrder.findUnique({ where: { id: input.order.id } });
    if (current?.status === "paid" || current?.status === "fulfilled") {
        return finishVerifiedOrder(current, input.now, "iyzico");
    }
    return "unchanged";
}

export async function reconcilePaymentOrder(input: {
    order: PaymentOrder;
    environment?: Readonly<Record<string, string | undefined>>;
    paytrQuery?: PaytrStatusQuery;
    iyzicoVerify?: IyzicoCheckoutVerification;
    now: Date;
    retryDelayMinutes: number;
}): Promise<"fulfilled" | "review" | "unchanged"> {
    const environment = input.environment ?? process.env;
    if (input.order.provider === "paytr") {
        return reconcilePaytrOrder({
            order: input.order,
            credentials: paytrCredentialsFromEnvironment(environment),
            query: input.paytrQuery,
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
    }
    if (input.order.provider === "iyzico") {
        if (!isIyzicoReconciliationEnabled(environment)) {
            throw new Error("iyzico_reconciliation_not_configured");
        }
        return reconcileIyzicoOrder({
            order: input.order,
            credentials: iyzicoCredentialsFromEnvironment(environment),
            verify: input.iyzicoVerify,
            now: input.now,
            retryDelayMinutes: input.retryDelayMinutes,
        });
    }
    return "unchanged";
}

export async function runPaymentReconciliation(input: {
    config: PaymentReconciliationConfig;
    dryRun: boolean;
    environment?: Readonly<Record<string, string | undefined>>;
    query?: PaytrStatusQuery;
    iyzicoVerify?: IyzicoCheckoutVerification;
    now?: Date;
}) {
    const now = input.now ?? new Date();
    const environment = input.environment ?? process.env;
    const cutoff = new Date(now.getTime() - input.config.minAgeMinutes * 60_000);
    const enabledProviders: PaymentProvider[] = isIyzicoReconciliationEnabled(environment)
        ? ["paytr", "iyzico"]
        : ["paytr"];
    const orders = await prisma.paymentOrder.findMany({
        where: {
            provider: { in: enabledProviders },
            createdAt: { lte: cutoff },
            OR: [
                {
                    provider: "iyzico",
                    status: "pending_provider",
                    reconciliationCase: {
                        status: "open",
                        attemptCount: { lt: input.config.maxAttempts },
                        nextCheckAt: { lte: now },
                    },
                },
                {
                    status: { in: ["awaiting_payment", "paid"] },
                    OR: [
                        { reconciliationCase: null },
                        { reconciliationCase: { status: "open", attemptCount: { lt: input.config.maxAttempts }, nextCheckAt: { lte: now } } },
                    ],
                },
                {
                    status: "fulfilled",
                    fulfillment: { notificationSentAt: null },
                    OR: [
                        { reconciliationCase: null },
                        { reconciliationCase: { status: "open", attemptCount: { lt: input.config.maxAttempts }, nextCheckAt: { lte: now } } },
                    ],
                },
            ],
        },
        orderBy: { createdAt: "asc" },
        take: input.config.batchSize,
    });
    const candidatesByProvider = {
        paytr: orders.filter((order) => order.provider === "paytr").length,
        iyzico: orders.filter((order) => order.provider === "iyzico").length,
    };
    if (input.dryRun) {
        return {
            dryRun: true,
            candidateCount: orders.length,
            candidatesByProvider,
            iyzicoEnabled: enabledProviders.includes("iyzico"),
        };
    }

    let fulfilled = 0;
    let review = 0;
    let unchanged = 0;
    for (const order of orders) {
        try {
            const outcome = await reconcilePaymentOrder({
                order,
                environment,
                paytrQuery: input.query,
                iyzicoVerify: input.iyzicoVerify,
                now,
                retryDelayMinutes: input.config.retryDelayMinutes,
            });
            if (outcome === "fulfilled") fulfilled += 1;
            else if (outcome === "review") review += 1;
            else unchanged += 1;
        } catch (error) {
            await upsertCase({
                orderId: order.id,
                reasonCode: "local_completion_failed",
                errorCode: error instanceof Error ? error.name.slice(0, 80) : "unknown_error",
                now,
                retryDelayMinutes: input.config.retryDelayMinutes,
            });
            review += 1;
        }
    }
    return {
        dryRun: false,
        candidateCount: orders.length,
        candidatesByProvider,
        iyzicoEnabled: enabledProviders.includes("iyzico"),
        fulfilled,
        review,
        unchanged,
    };
}
