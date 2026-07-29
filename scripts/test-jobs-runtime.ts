import assert from "node:assert/strict";
import {
    runAuditRetention,
    type AuditRetentionStore,
} from "../apps/jobs/src/audit-retention";
import {
    areJobsEnabled,
    getAuditRetentionConfig,
    getMobileAuthRetentionConfig,
} from "../apps/jobs/src/config";
import {
    runMobileAuthRetention,
    type MobileAuthRetentionStore,
} from "../apps/jobs/src/mobile-auth-retention";
import { acquireJobLease } from "../apps/jobs/src/lease";
import {
    getJobDefinition,
    isJobName,
    JOB_NAMES,
} from "../apps/jobs/src/registry";
import {
    resetRedisTestClient,
    setRedisTestClient,
    type RedisLikeClient,
} from "@hushle/platform-cache";

const config = getAuditRetentionConfig({
    AUDIT_HOT_RETENTION_DAYS: "90",
    AUDIT_ARCHIVE_BATCH_SIZE: "10",
    AUDIT_ARCHIVE_MAX_BATCHES: "2",
    AUDIT_ARCHIVE_LEASE_TTL_MS: "60000",
});
assert.deepEqual(config, {
    hotDays: 90,
    batchSize: 10,
    maxBatches: 2,
    leaseTtlMs: 60_000,
});
assert.equal(areJobsEnabled(undefined), false);
assert.equal(areJobsEnabled("true"), true);
assert.throws(() => areJobsEnabled("yes"), /must be true or false/);
assert.deepEqual(JOB_NAMES, ["audit-retention", "mobile-auth-retention"]);
assert.equal(isJobName("audit-retention"), true);
assert.equal(isJobName("mobile-auth-retention"), true);
assert.equal(isJobName("unknown-job"), false);
assert.equal(getJobDefinition("audit-retention").leaseTtlMs, 900_000);
assert.deepEqual(
    getMobileAuthRetentionConfig({
        MOBILE_AUTH_RETENTION_DAYS: "30",
        MOBILE_AUTH_REUSE_EVIDENCE_DAYS: "7",
        MOBILE_AUTH_RETENTION_BATCH_SIZE: "500",
        MOBILE_AUTH_RETENTION_LEASE_TTL_MS: "300000",
    }),
    {
        retentionDays: 30,
        reuseEvidenceDays: 7,
        batchSize: 500,
        leaseTtlMs: 300_000,
    }
);

async function main(): Promise<void> {
    const leaseValues = new Map<string, string>();
    const leaseClient: RedisLikeClient = {
        async ping() {
            return "PONG";
        },
        async get(key) {
            return leaseValues.get(key) ?? null;
        },
        async set(key, value, options) {
            if (options?.NX && leaseValues.has(key)) return null;
            leaseValues.set(key, value);
            return "OK";
        },
        async del(key) {
            return leaseValues.delete(key) ? 1 : 0;
        },
        async incr() {
            return 1;
        },
        async pExpire() {
            return 1;
        },
        async pTTL() {
            return 60_000;
        },
        async eval(_script, options) {
            const key = options.keys[0];
            const token = options.arguments[0];
            if (!key || leaseValues.get(key) !== token) return 0;
            return leaseValues.delete(key) ? 1 : 0;
        },
    };
    setRedisTestClient(leaseClient);
    try {
        const firstLease = await acquireJobLease("audit-retention", 60_000);
        assert.ok(firstLease);
        assert.equal(
            await acquireJobLease("audit-retention", 60_000),
            null
        );
        await firstLease.release();
        const nextLease = await acquireJobLease("audit-retention", 60_000);
        assert.ok(nextLease);
        await nextLease.release();
    } finally {
        resetRedisTestClient();
    }

    let findCalls = 0;
    let mutationCalls = 0;
    const dryRunStore: AuditRetentionStore = {
        async findCandidates() {
            findCalls += 1;
            return [{ id: 1, createdAt: new Date("2025-01-01T00:00:00.000Z") }];
        },
        async archiveAndDelete() {
            mutationCalls += 1;
            return { archivedCount: 1, deletedCount: 1 };
        },
    };
    const dryRunResult = await runAuditRetention({
        config,
        dryRun: true,
        now: new Date("2026-07-27T00:00:00.000Z"),
        store: dryRunStore,
    });
    assert.equal(findCalls, 1);
    assert.equal(mutationCalls, 0);
    assert.equal(dryRunResult.candidateCount, 1);
    assert.equal(dryRunResult.deletedCount, 0);

    let batch = 0;
    const executeStore: AuditRetentionStore = {
        async findCandidates() {
            batch += 1;
            if (batch === 1) {
                return Array.from({ length: 10 }, (_, index) => ({
                    id: index + 1,
                    createdAt: new Date("2025-01-01T00:00:00.000Z"),
                }));
            }
            return [];
        },
        async archiveAndDelete(ids) {
            return { archivedCount: ids.length, deletedCount: ids.length };
        },
    };
    const executeResult = await runAuditRetention({
        config,
        dryRun: false,
        now: new Date("2026-07-27T00:00:00.000Z"),
        store: executeStore,
    });
    assert.equal(executeResult.batchesProcessed, 1);
    assert.equal(executeResult.archivedCount, 10);
    assert.equal(executeResult.deletedCount, 10);
    assert.equal(executeResult.hasMore, false);

    await assert.rejects(
        runAuditRetention({
            config,
            dryRun: false,
            store: {
                async findCandidates() {
                    return Array.from({ length: 10 }, (_, index) => ({
                        id: index + 1,
                        createdAt: new Date("2025-01-01T00:00:00.000Z"),
                    }));
                },
                async archiveAndDelete() {
                    return { archivedCount: 0, deletedCount: 0 };
                },
            },
        }),
        /made no progress/
    );

    let retentionDeletes = 0;
    const mobileAuthStore: MobileAuthRetentionStore = {
        async findCandidateIds() {
            return ["session-1"];
        },
        async deleteCandidates(ids) {
            retentionDeletes += ids.length;
            return ids.length;
        },
        async deleteTokenEvidence() {
            return 2;
        },
    };
    const retentionDryRun = await runMobileAuthRetention({
        config: getMobileAuthRetentionConfig(),
        dryRun: true,
        store: mobileAuthStore,
    });
    assert.equal(retentionDryRun.candidateCount, 1);
    assert.equal(retentionDryRun.deletedCount, 0);
    assert.equal(retentionDeletes, 0);
    const retentionExecute = await runMobileAuthRetention({
        config: getMobileAuthRetentionConfig(),
        dryRun: false,
        store: mobileAuthStore,
    });
    assert.equal(retentionExecute.deletedCount, 1);
    assert.equal(retentionExecute.deletedTokenCount, 2);
    assert.equal(retentionDeletes, 1);

    console.log("jobs runtime smoke test passed");
}

void main();
