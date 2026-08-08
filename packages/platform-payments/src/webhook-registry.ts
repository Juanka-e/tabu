import type { PaymentProviderId } from "./contracts";
import { createPaytrWebhookVerifier } from "./adapters/paytr";
import type { PaymentWebhookVerifier } from "./webhook-inbox";

type WebhookEnvironment = Record<string, string | undefined>;

export function getPaymentWebhookVerifier(
    provider: PaymentProviderId,
    environment: WebhookEnvironment = process.env
): PaymentWebhookVerifier | null {
    if (
        provider !== "paytr"
        || environment.PAYTR_CHECKOUT_MODE?.trim().toLowerCase() !== "sandbox"
    ) {
        return null;
    }

    try {
        return createPaytrWebhookVerifier({
            merchantId: environment.PAYTR_MERCHANT_ID ?? "",
            merchantKey: environment.PAYTR_MERCHANT_KEY ?? "",
            merchantSalt: environment.PAYTR_MERCHANT_SALT ?? "",
        });
    } catch {
        return null;
    }
}
