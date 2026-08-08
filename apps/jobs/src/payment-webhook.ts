import { prisma } from "@hushle/platform-db";
import {
    processPaymentWebhookInbox,
    type PaymentWebhookProcessor,
} from "@hushle/platform-payments";
import type { PaymentWebhookConfig } from "./config";

function getPaymentWebhookProcessor(): PaymentWebhookProcessor | null {
    // Added by the first reviewed provider adapter; foundation remains fail-closed.
    return null;
}

export async function runPaymentWebhook(input: {
    config: PaymentWebhookConfig;
    dryRun: boolean;
    now?: Date;
}) {
    const now = input.now ?? new Date();
    if (input.dryRun) {
        const candidateCount = await prisma.paymentWebhookEvent.count({
            where: {
                OR: [
                    { status: { in: ["pending", "retry"] }, availableAt: { lte: now } },
                    { status: "processing", claimExpiresAt: { lte: now } },
                ],
            },
        });
        return {
            dryRun: true,
            processorReady: Boolean(getPaymentWebhookProcessor()),
            candidateCount: Math.min(candidateCount, input.config.batchSize),
        };
    }

    const processor = getPaymentWebhookProcessor();
    if (!processor) {
        throw new Error("Payment webhook processor is not configured");
    }
    return {
        dryRun: false,
        ...(await processPaymentWebhookInbox({
            processor,
            batchSize: input.config.batchSize,
            maxAttempts: input.config.maxAttempts,
            claimTtlMs: input.config.claimTtlMs,
            now,
        })),
    };
}
