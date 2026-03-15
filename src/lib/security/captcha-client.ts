import type { CaptchaAction, PublicCaptchaConfig } from "@/types/captcha";

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: HTMLElement,
                options: Record<string, unknown>
            ) => string;
            execute: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
        grecaptcha?: {
            ready: (callback: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

let activeTurnstileScriptPromise: Promise<void> | null = null;
let activeRecaptchaScriptPromise: Promise<void> | null = null;

function loadScript(src: string, dataAttribute: string): Promise<void> {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Captcha sadece client tarafinda calisir."));
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
        `script[${dataAttribute}="true"]`
    );
    if (existingScript) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.setAttribute(dataAttribute, "true");
        script.onload = () => resolve();
        script.onerror = () =>
            reject(new Error("Captcha script yuklenemedi."));
        document.head.appendChild(script);
    });
}

function ensureTurnstileLoaded(): Promise<void> {
    if (!activeTurnstileScriptPromise) {
        activeTurnstileScriptPromise = loadScript(
            "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
            "data-turnstile-script"
        );
    }

    return activeTurnstileScriptPromise;
}

function ensureRecaptchaLoaded(siteKey: string): Promise<void> {
    if (!activeRecaptchaScriptPromise) {
        activeRecaptchaScriptPromise = loadScript(
            `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`,
            "data-recaptcha-script"
        );
    }

    return activeRecaptchaScriptPromise;
}

async function fetchCaptchaConfig(action: CaptchaAction): Promise<PublicCaptchaConfig> {
    const response = await fetch(`/api/security/captcha-config?action=${encodeURIComponent(action)}`, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Captcha ayarlari alinamadi.");
    }

    return (await response.json()) as PublicCaptchaConfig;
}

async function executeTurnstile(config: PublicCaptchaConfig, action: CaptchaAction): Promise<string> {
    const siteKey = config.siteKey;
    if (!siteKey) {
        throw new Error("Turnstile site key eksik.");
    }

    await ensureTurnstileLoaded();

    if (!window.turnstile) {
        throw new Error("Turnstile kullanima hazir degil.");
    }

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    document.body.appendChild(container);

    try {
        const token = await new Promise<string>((resolve, reject) => {
            const widgetId = window.turnstile!.render(container, {
                sitekey: siteKey,
                action,
                appearance:
                    config.turnstileMode === "managed"
                        ? "interaction-only"
                        : "execute",
                execution: "execute",
                size:
                    config.turnstileMode === "invisible"
                        ? "invisible"
                        : "normal",
                callback: (value: string) => resolve(value),
                "error-callback": () => reject(new Error("Turnstile token alinamadi.")),
                "expired-callback": () => reject(new Error("Turnstile token suresi doldu.")),
            });

            window.turnstile!.execute(widgetId);
        });

        return token;
    } finally {
        document.body.removeChild(container);
    }
}

async function executeRecaptcha(siteKey: string, action: CaptchaAction): Promise<string> {
    await ensureRecaptchaLoaded(siteKey);

    if (!window.grecaptcha) {
        throw new Error("reCAPTCHA kullanima hazir degil.");
    }

    return await new Promise<string>((resolve, reject) => {
        window.grecaptcha!.ready(() => {
            window.grecaptcha!
                .execute(siteKey, { action })
                .then(resolve)
                .catch(() => reject(new Error("reCAPTCHA token alinamadi.")));
        });
    });
}

export async function getCaptchaTokenForAction(action: CaptchaAction): Promise<{
    token: string | null;
    action: CaptchaAction;
    config: PublicCaptchaConfig;
}> {
    const config = await fetchCaptchaConfig(action);

    if (!config.required || !config.enabled) {
        return {
            token: null,
            action,
            config,
        };
    }

    if (!config.siteKey || config.provider === "none") {
        return {
            token: null,
            action,
            config,
        };
    }

    const token =
        config.provider === "turnstile"
            ? await executeTurnstile(config, action)
            : await executeRecaptcha(config.siteKey, action);

    return {
        token,
        action,
        config,
    };
}
