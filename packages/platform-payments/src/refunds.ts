import { z } from "zod";
import type { PaymentProviderId } from "./contracts";
import {
    PaytrAdapterError,
    requestPaytrRefund,
    type PaytrCredentials,
} from "./adapters/paytr";
import type { PaymentEnvironment } from "./provider-registry";

export const paymentRefundRequestSchema = z.object({
    merchantOrderId: z.string().trim().regex(/^[A-Za-z0-9]{1,64}$/),
    amountMinor: z.number().int().min(1).max(2_147_483_647),
    currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
    referenceNo: z.string().trim().regex(/^[A-Za-z0-9]{1,64}$/),
});

export type PaymentRefundRequest = z.input<typeof paymentRefundRequestSchema>;
export type PaymentRefundResult = {
    provider: PaymentProviderId;
    merchantOrderId: string;
    amountMinor: number;
    currency: string;
    referenceNo: string;
    testMode: boolean;
};

export interface PaymentRefundAdapter {
    readonly provider: PaymentProviderId;
    refund(request: PaymentRefundRequest): Promise<PaymentRefundResult>;
}

export type PaymentRefundReadiness = {
    provider: PaymentProviderId;
    mode: "disabled" | "sandbox" | "invalid";
    ready: boolean;
    issues: string[];
};

function configured(value: string | undefined): boolean {
    const normalized = value?.trim().toLowerCase() ?? "";
    return Boolean(normalized && !normalized.includes("replace_with_"));
}

export function getPaymentRefundReadiness(
    provider: PaymentProviderId,
    environment: PaymentEnvironment = process.env
): PaymentRefundReadiness {
    if (provider !== "paytr") {
        return { provider, mode: "disabled", ready: false, issues: ["refund_adapter_unavailable"] };
    }
    const rawMode = environment.PAYTR_REFUND_MODE?.trim().toLowerCase() || "disabled";
    const mode = rawMode === "disabled" || rawMode === "sandbox" ? rawMode : "invalid";
    const issues: string[] = [];
    if (mode === "disabled") issues.push("refund_disabled");
    if (mode === "invalid") issues.push("refund_mode_invalid");
    if (mode === "sandbox" && environment.PAYTR_CHECKOUT_MODE?.trim().toLowerCase() !== "sandbox") {
        issues.push("refund_checkout_mode_mismatch");
    }
    if (mode === "sandbox") {
        const merchantId = environment.PAYTR_MERCHANT_ID?.trim() ?? "";
        const merchantKey = environment.PAYTR_MERCHANT_KEY ?? "";
        const merchantSalt = environment.PAYTR_MERCHANT_SALT ?? "";
        if (!configured(merchantId)) issues.push("paytr_merchant_id_missing");
        else if (!/^\d{1,64}$/.test(merchantId)) issues.push("paytr_merchant_id_invalid");
        if (!configured(merchantKey)) issues.push("paytr_merchant_key_missing");
        else if (merchantKey.length > 512) issues.push("paytr_merchant_key_invalid");
        if (!configured(merchantSalt)) issues.push("paytr_merchant_salt_missing");
        else if (merchantSalt.length > 512) issues.push("paytr_merchant_salt_invalid");
    }
    return { provider, mode, ready: mode === "sandbox" && issues.length === 0, issues };
}

export function createPaymentRefundAdapter(input: {
    provider: PaymentProviderId;
    environment?: PaymentEnvironment;
    fetchImpl?: typeof fetch;
}): PaymentRefundAdapter | null {
    const environment = input.environment ?? process.env;
    if (!getPaymentRefundReadiness(input.provider, environment).ready || input.provider !== "paytr") {
        return null;
    }
    const credentials: PaytrCredentials = {
        merchantId: environment.PAYTR_MERCHANT_ID ?? "",
        merchantKey: environment.PAYTR_MERCHANT_KEY ?? "",
        merchantSalt: environment.PAYTR_MERCHANT_SALT ?? "",
    };
    return {
        provider: "paytr",
        async refund(request) {
            const parsed = paymentRefundRequestSchema.safeParse(request);
            if (!parsed.success) throw new PaytrAdapterError("invalid_request");
            if (!(["TRY", "USD", "EUR", "GBP", "RUB"] as const).includes(
                parsed.data.currency as "TRY" | "USD" | "EUR" | "GBP" | "RUB"
            )) {
                throw new PaytrAdapterError("invalid_request");
            }
            const result = await requestPaytrRefund({
                merchantOrderId: parsed.data.merchantOrderId,
                amountMinor: parsed.data.amountMinor,
                referenceNo: parsed.data.referenceNo,
                credentials,
                fetchImpl: input.fetchImpl,
            });
            return { provider: "paytr", currency: parsed.data.currency, ...result };
        },
    };
}
