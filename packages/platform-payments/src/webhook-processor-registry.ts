import { processIyzicoPaymentWebhook } from "./iyzico-webhook-processor";
import { processPaytrPaymentWebhook } from "./paytr-webhook-processor";
import {
    PaymentWebhookProcessingError,
    type PaymentWebhookProcessor,
} from "./webhook-inbox";

type WebhookEnvironment = Record<string, string | undefined>;

export function getPaymentWebhookProcessor(
    environment: WebhookEnvironment = process.env
): PaymentWebhookProcessor {
    return async (event) => {
        if (event.provider === "paytr") return processPaytrPaymentWebhook(event);
        if (event.provider === "iyzico") {
            if (
                environment.IYZICO_CHECKOUT_MODE?.trim().toLowerCase() !== "sandbox"
                || environment.IYZICO_WEBHOOK_MODE?.trim().toLowerCase() !== "sandbox"
            ) throw new PaymentWebhookProcessingError("iyzico_processor_not_configured", true);
            return processIyzicoPaymentWebhook(event, {
                credentials: {
                    apiKey: environment.IYZICO_API_KEY ?? "",
                    secretKey: environment.IYZICO_SECRET_KEY ?? "",
                },
            });
        }
        throw new PaymentWebhookProcessingError("provider_not_supported", false);
    };
}
