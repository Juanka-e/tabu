import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
    return readFileSync(path, "utf8");
}

const workflow = read(".github/workflows/deploy-production.yml");
const deployScript = read("scripts/ops/deploy.sh");
const compose = read("docker-compose.yml");
const releaseProcess = read("docs/deploy/release-process.md");
const incidentRunbook = read("docs/deploy/rollback-and-incident.md");
const launchChecklist = read("docs/deploy/launch-day-checklist.md");
const healthGuard = read("apps/web/src/lib/security/health-check.ts");
const backupScript = read("scripts/ops/mysql-backup.sh");
const restoreScript = read("scripts/ops/mysql-restore.sh");
const schemaOpsLock = read("scripts/ops/lib/schema-ops-lock.sh");
const preflight = read("scripts/lib/production-preflight.mjs");

assert.match(workflow, /branches:\s*\n\s*-\s*main/);
assert.doesNotMatch(workflow, /branches:\s*\[[^\]]*develop/);
assert.match(workflow, /environment:\s*production/);
assert.match(workflow, /group:\s*production-deploy/);
assert.match(workflow, /cancel-in-progress:\s*false/);
assert.match(workflow, /GITHUB_SHA.*\.release-sha/);
assert.match(workflow, /sha256sum hushle-release\.tgz/);
assert.match(workflow, /sha256sum -c hushle-release\.tgz\.sha256/);
assert.doesNotMatch(`${workflow}\n${deployScript}`, /prisma\s+db\s+push/);
assert.match(deployScript, /--profile migration/);
assert.match(deployScript, /run --rm migrate/);
assert.match(deployScript, /acquire_schema_ops_lock/);
assert.match(deployScript, /production-preflight\.mjs/);
assert.match(deployScript, /--network none/);
assert.match(preflight, /Secret values were not printed|validateProductionEnvironment/);
assert.match(backupScript, /acquire_schema_ops_lock/);
assert.match(restoreScript, /acquire_schema_ops_lock/);
assert.match(schemaOpsLock, /flock -w/);
assert.match(restoreScript, /In-place restore to the active database is disabled/);
assert.match(restoreScript, /Refusing to restore over the active database/);

assert.match(compose, /REALTIME_TOPOLOGY:\s*\$\{REALTIME_TOPOLOGY:-single-writer\}/);
assert.match(compose, /REALTIME_REPLICA_COUNT:\s*\$\{REALTIME_REPLICA_COUNT:-1\}/);
assert.match(compose, /PRODUCT_ANALYTICS_ENABLED:\s*\$\{PRODUCT_ANALYTICS_ENABLED:-false\}/);
assert.match(compose, /WORD_ANALYTICS_ENABLED:\s*\$\{WORD_ANALYTICS_ENABLED:-false\}/);
assert.doesNotMatch(
    compose.match(/\n  app:[\s\S]*?\n  mysql:/)?.[0] ?? "",
    /\n\s+ports:/
);

assert.match(healthGuard, /x-health-token/);
assert.match(releaseProcess, /atomik release directory gecisi yapmaz/);
assert.match(releaseProcess, /prisma\/migrations/);
assert.match(releaseProcess, /prisma migrate deploy/);
assert.match(releaseProcess, /Destructive SQL/);
assert.match(releaseProcess, /Release SHA:/);
assert.match(releaseProcess, /Rollback adayi:/);
assert.match(releaseProcess, /x-health-token: \$HEALTHCHECK_TOKEN/);

assert.match(incidentRunbook, /docker compose down -v/);
assert.match(incidentRunbook, /MySQL volume'u silinmez/);
assert.match(incidentRunbook, /Onceki arsiv yoksa kontrollu forward-fix/);
assert.match(incidentRunbook, /izole restore/i);
assert.match(launchChecklist, /duplicate finalize idempotency/i);
assert.match(launchChecklist, /Product\/word analytics/);

console.log("Release operations documentation checks passed.");
