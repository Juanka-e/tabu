import { runAuditRetention } from "./audit-retention";
import { getAuditRetentionConfig } from "./config";

export const JOB_NAMES = ["audit-retention"] as const;
export type JobName = (typeof JOB_NAMES)[number];

export interface JobDefinition {
    leaseTtlMs: number;
    run(options: { dryRun: boolean }): Promise<object>;
}

export function isJobName(value: string): value is JobName {
    return JOB_NAMES.includes(value as JobName);
}

export function getJobDefinition(job: JobName): JobDefinition {
    switch (job) {
        case "audit-retention": {
            const config = getAuditRetentionConfig();
            return {
                leaseTtlMs: config.leaseTtlMs,
                run: ({ dryRun }) => runAuditRetention({ config, dryRun }),
            };
        }
    }
}
