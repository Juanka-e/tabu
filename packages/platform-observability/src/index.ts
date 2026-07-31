const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const EVENT_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const SENSITIVE_KEY_PATTERN = /(?:authorization|cookie|credential|email|password|secret|session|token)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const URL_CREDENTIAL_PATTERN = /(\w+:\/\/)[^\s/@:]+:[^\s/@]+@/gi;
const KEY_VALUE_SECRET_PATTERN = /\b(password|secret|token|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi;

export type ObservabilityLevel = "info" | "warn" | "error";
export type SafeContextValue = string | number | boolean | null | SafeContextValue[];

export interface ObservabilityEvent {
    timestamp: string;
    level: ObservabilityLevel;
    service: string;
    environment: string;
    event: string;
    requestId?: string;
    message?: string;
    error?: {
        type: string;
        message: string;
        stack?: string;
    };
    context?: Record<string, SafeContextValue>;
}

export interface ObservabilityExporter {
    capture(event: ObservabilityEvent): void | Promise<void>;
    flush?(): void | Promise<void>;
}

export interface ObservabilityStatus {
    emitted: number;
    errors: number;
    warnings: number;
    exporterConfigured: boolean;
    exporterFailures: number;
    droppedContextFields: number;
    lastErrorAt: string | null;
}

interface ObservabilityState extends ObservabilityStatus {
    exporter: ObservabilityExporter | null;
    sink: (level: ObservabilityLevel, line: string) => void;
}

type ObservabilityGlobal = typeof globalThis & {
    __hushleObservabilityState?: ObservabilityState;
};

function defaultSink(level: ObservabilityLevel, line: string): void {
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
}

function getState(): ObservabilityState {
    const observabilityGlobal = globalThis as ObservabilityGlobal;
    observabilityGlobal.__hushleObservabilityState ??= {
        emitted: 0,
        errors: 0,
        warnings: 0,
        exporterConfigured: false,
        exporterFailures: 0,
        droppedContextFields: 0,
        lastErrorAt: null,
        exporter: null,
        sink: defaultSink,
    };
    return observabilityGlobal.__hushleObservabilityState;
}

export function isValidRequestId(value: string | null | undefined): value is string {
    return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function getOrCreateRequestId(value?: string | null): string {
    return isValidRequestId(value) ? value : crypto.randomUUID();
}

function redactString(value: string, maxLength = 500): string {
    return value
        .replace(EMAIL_PATTERN, "[redacted-email]")
        .replace(BEARER_PATTERN, "Bearer [redacted]")
        .replace(URL_CREDENTIAL_PATTERN, "$1[redacted]@")
        .replace(KEY_VALUE_SECRET_PATTERN, "$1=[redacted]")
        .slice(0, maxLength);
}

function sanitizeContextValue(
    value: unknown,
    depth = 0
): SafeContextValue | undefined {
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string") return redactString(value, 200);
    if (Array.isArray(value)) {
        if (depth >= 2) return undefined;
        const values = value
            .slice(0, 10)
            .map((entry) => sanitizeContextValue(entry, depth + 1))
            .filter((entry): entry is SafeContextValue => entry !== undefined);
        return values;
    }
    return undefined;
}

export function sanitizeObservabilityContext(
    context: Record<string, unknown> | undefined
): Record<string, SafeContextValue> | undefined {
    if (!context) return undefined;
    const state = getState();
    const result: Record<string, SafeContextValue> = {};
    for (const [key, rawValue] of Object.entries(context).slice(0, 24)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
            state.droppedContextFields += 1;
            continue;
        }
        const value = sanitizeContextValue(rawValue);
        if (value === undefined) {
            state.droppedContextFields += 1;
            continue;
        }
        result[key.slice(0, 64)] = value;
    }
    return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeError(error: unknown): ObservabilityEvent["error"] {
    if (!(error instanceof Error)) {
        return { type: "UnknownError", message: "Unknown runtime error" };
    }
    return {
        type: redactString(error.name || "Error", 80),
        message: redactString(error.message || "Runtime error"),
        ...(error.stack ? { stack: redactString(error.stack, 4_000) } : {}),
    };
}

function normalizeName(value: string, fallback: string): string {
    const normalized = value.trim().toLowerCase();
    return EVENT_NAME_PATTERN.test(normalized) ? normalized : fallback;
}

export function configureObservabilityExporter(
    exporter: ObservabilityExporter | null
): void {
    const state = getState();
    state.exporter = exporter;
    state.exporterConfigured = exporter !== null;
}

export async function emitObservabilityEvent(input: {
    level: ObservabilityLevel;
    service: string;
    event: string;
    requestId?: string | null;
    message?: string;
    error?: unknown;
    context?: Record<string, unknown>;
}): Promise<void> {
    const state = getState();
    const timestamp = new Date().toISOString();
    const context = sanitizeObservabilityContext(input.context);
    const event: ObservabilityEvent = {
        timestamp,
        level: input.level,
        service: normalizeName(input.service, "unknown-service"),
        environment: normalizeName(process.env.NODE_ENV ?? "unknown", "unknown"),
        event: normalizeName(input.event, "unknown-event"),
        ...(isValidRequestId(input.requestId) ? { requestId: input.requestId } : {}),
        ...(input.message ? { message: redactString(input.message) } : {}),
        ...(input.error !== undefined ? { error: normalizeError(input.error) } : {}),
        ...(context ? { context } : {}),
    };

    state.emitted += 1;
    if (input.level === "error") {
        state.errors += 1;
        state.lastErrorAt = timestamp;
    } else if (input.level === "warn") {
        state.warnings += 1;
    }
    state.sink(input.level, JSON.stringify(event));

    if (state.exporter) {
        try {
            const capture = state.exporter.capture(event);
            if (capture && typeof capture.then === "function") {
                void capture.catch(() => {
                    state.exporterFailures += 1;
                });
            }
        } catch {
            state.exporterFailures += 1;
        }
    }
}

export async function flushObservabilityExporter(
    timeoutMs = 2_000
): Promise<boolean> {
    const state = getState();
    if (!state.exporter?.flush) return true;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        await Promise.race([
            Promise.resolve(state.exporter.flush()),
            new Promise<never>((_resolve, reject) => {
                timeout = setTimeout(
                    () => reject(new Error("observability_flush_timeout")),
                    Math.max(1, timeoutMs)
                );
            }),
        ]);
        return true;
    } catch {
        state.exporterFailures += 1;
        return false;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

export function reportError(
    input: Omit<Parameters<typeof emitObservabilityEvent>[0], "level">
): Promise<void> {
    return emitObservabilityEvent({ ...input, level: "error" });
}

export function reportWarning(
    input: Omit<
        Parameters<typeof emitObservabilityEvent>[0],
        "level" | "error"
    >
): Promise<void> {
    return emitObservabilityEvent({ ...input, level: "warn" });
}

export function getObservabilityStatus(): ObservabilityStatus {
    const state = getState();
    return {
        emitted: state.emitted,
        errors: state.errors,
        warnings: state.warnings,
        exporterConfigured: state.exporterConfigured,
        exporterFailures: state.exporterFailures,
        droppedContextFields: state.droppedContextFields,
        lastErrorAt: state.lastErrorAt,
    };
}

export function resetObservabilityForTests(options?: {
    sink?: (level: ObservabilityLevel, line: string) => void;
}): void {
    const state = getState();
    state.emitted = 0;
    state.errors = 0;
    state.warnings = 0;
    state.exporterConfigured = false;
    state.exporterFailures = 0;
    state.droppedContextFields = 0;
    state.lastErrorAt = null;
    state.exporter = null;
    state.sink = options?.sink ?? defaultSink;
}
