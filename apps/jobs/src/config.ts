export interface AuditRetentionConfig {
    hotDays: number;
    batchSize: number;
    maxBatches: number;
    leaseTtlMs: number;
}

interface JobsEnvironment {
    [key: string]: string | undefined;
    AUDIT_HOT_RETENTION_DAYS?: string;
    AUDIT_ARCHIVE_BATCH_SIZE?: string;
    AUDIT_ARCHIVE_MAX_BATCHES?: string;
    AUDIT_ARCHIVE_LEASE_TTL_MS?: string;
}

function parseBoundedInteger(input: {
    name: string;
    value: string | undefined;
    fallback: number;
    min: number;
    max: number;
}): number {
    if (!input.value?.trim()) return input.fallback;

    const parsed = Number.parseInt(input.value, 10);
    if (!Number.isInteger(parsed) || parsed < input.min || parsed > input.max) {
        throw new Error(
            `${input.name} must be an integer between ${input.min} and ${input.max}`
        );
    }
    return parsed;
}

export function getAuditRetentionConfig(
    env: JobsEnvironment = process.env
): AuditRetentionConfig {
    return {
        hotDays: parseBoundedInteger({
            name: "AUDIT_HOT_RETENTION_DAYS",
            value: env.AUDIT_HOT_RETENTION_DAYS,
            fallback: 90,
            min: 30,
            max: 3_650,
        }),
        batchSize: parseBoundedInteger({
            name: "AUDIT_ARCHIVE_BATCH_SIZE",
            value: env.AUDIT_ARCHIVE_BATCH_SIZE,
            fallback: 500,
            min: 10,
            max: 5_000,
        }),
        maxBatches: parseBoundedInteger({
            name: "AUDIT_ARCHIVE_MAX_BATCHES",
            value: env.AUDIT_ARCHIVE_MAX_BATCHES,
            fallback: 10,
            min: 1,
            max: 100,
        }),
        leaseTtlMs: parseBoundedInteger({
            name: "AUDIT_ARCHIVE_LEASE_TTL_MS",
            value: env.AUDIT_ARCHIVE_LEASE_TTL_MS,
            fallback: 15 * 60_000,
            min: 60_000,
            max: 60 * 60_000,
        }),
    };
}

export function areJobsEnabled(
    value = process.env.JOBS_ENABLED
): boolean {
    if (value === undefined || value.trim() === "") return false;
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    throw new Error("JOBS_ENABLED must be true or false");
}
