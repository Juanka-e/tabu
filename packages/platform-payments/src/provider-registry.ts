import {
    PAYMENT_PROVIDER_IDS,
    type PaymentProviderId,
} from "./contracts";

export interface PaymentProviderDescriptor {
    id: PaymentProviderId;
    title: string;
    requiredEnvironment: readonly string[];
    supportedCurrencies: readonly string[];
    adapterAvailable: boolean;
}

export interface PaymentProviderReadiness extends PaymentProviderDescriptor {
    credentialsConfigured: boolean;
    ready: boolean;
    missingEnvironment: string[];
}

export interface PaymentRuntimeReadiness {
    enabled: boolean;
    activeProvider: PaymentProviderId | null;
    ready: boolean;
    issues: string[];
}

export type PaymentEnvironment = Readonly<Record<string, string | undefined>>;

const providers = {
    shopier_v2: {
        id: "shopier_v2",
        title: "Shopier V2",
        requiredEnvironment: ["SHOPIER_API_KEY", "SHOPIER_API_SECRET"],
        supportedCurrencies: ["TRY"],
        adapterAvailable: false,
    },
    iyzico: {
        id: "iyzico",
        title: "iyzico",
        requiredEnvironment: ["IYZICO_API_KEY", "IYZICO_SECRET_KEY", "IYZICO_BASE_URL"],
        supportedCurrencies: ["TRY", "USD", "EUR", "GBP"],
        adapterAvailable: false,
    },
    paytr: {
        id: "paytr",
        title: "PayTR",
        requiredEnvironment: ["PAYTR_MERCHANT_ID", "PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT"],
        supportedCurrencies: ["TRY", "USD", "EUR", "GBP", "RUB"],
        adapterAvailable: false,
    },
    stripe: {
        id: "stripe",
        title: "Stripe",
        requiredEnvironment: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
        supportedCurrencies: ["TRY", "USD", "EUR", "GBP"],
        adapterAvailable: false,
    },
    lemonsqueezy: {
        id: "lemonsqueezy",
        title: "Lemon Squeezy",
        requiredEnvironment: ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_WEBHOOK_SECRET", "LEMONSQUEEZY_STORE_ID"],
        supportedCurrencies: ["USD"],
        adapterAvailable: false,
    },
} as const satisfies Record<PaymentProviderId, PaymentProviderDescriptor>;

function hasUsableSecret(value: string | undefined): boolean {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return Boolean(normalized && !normalized.includes("replace_with_"));
}

export function getPaymentProviderDescriptor(
    provider: PaymentProviderId
): PaymentProviderDescriptor {
    return providers[provider];
}

export function getPaymentProviderReadiness(
    provider: PaymentProviderId,
    environment: PaymentEnvironment = process.env
): PaymentProviderReadiness {
    const descriptor = getPaymentProviderDescriptor(provider);
    const missingEnvironment = descriptor.requiredEnvironment.filter(
        (name) => !hasUsableSecret(environment[name])
    );
    const credentialsConfigured = missingEnvironment.length === 0;

    return {
        ...descriptor,
        credentialsConfigured,
        ready: credentialsConfigured && descriptor.adapterAvailable,
        missingEnvironment,
    };
}

export function listPaymentProviderReadiness(
    environment: PaymentEnvironment = process.env
): PaymentProviderReadiness[] {
    return PAYMENT_PROVIDER_IDS.map((provider) =>
        getPaymentProviderReadiness(provider, environment)
    );
}

export function getPaymentRuntimeReadiness(
    environment: PaymentEnvironment = process.env
): PaymentRuntimeReadiness {
    const enabled = environment.PAYMENTS_ENABLED?.trim().toLowerCase() === "true";
    const configuredProvider = environment.PAYMENT_ACTIVE_PROVIDER?.trim();
    const activeProvider = PAYMENT_PROVIDER_IDS.includes(
        configuredProvider as PaymentProviderId
    )
        ? (configuredProvider as PaymentProviderId)
        : null;
    const issues: string[] = [];

    if (!enabled) issues.push("checkout_disabled");
    if (!activeProvider) issues.push("active_provider_missing_or_invalid");
    if (activeProvider) {
        const provider = getPaymentProviderReadiness(activeProvider, environment);
        if (!provider.adapterAvailable) issues.push("active_provider_adapter_unavailable");
        if (!provider.credentialsConfigured) issues.push("active_provider_credentials_missing");
    }

    return {
        enabled,
        activeProvider,
        ready: enabled && Boolean(activeProvider) && issues.length === 0,
        issues,
    };
}

export function assertPaymentProviderReady(
    provider: PaymentProviderId,
    currency: string,
    environment: PaymentEnvironment = process.env
): void {
    const readiness = getPaymentProviderReadiness(provider, environment);
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!readiness.supportedCurrencies.includes(normalizedCurrency)) {
        throw new Error(`${provider} does not support ${normalizedCurrency}`);
    }
    if (!readiness.ready) {
        throw new Error(`${provider} is not ready for checkout creation`);
    }
}
