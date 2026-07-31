import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnvFile, validateProductionEnvironment } from "./lib/production-preflight.mjs";

function validEnvironment(): Record<string, string> {
    return {
        NODE_ENV: "production",
        AUTH_SECRET: "auth_A7xQ2mN9pL4vR8sT6wY3kD5cF1hJ0zB",
        HEALTHCHECK_TOKEN: "health_Z9pQ4mT7vL2xN8sR5wK1dF6cA3jH0yB",
        MYSQL_ROOT_PASSWORD: "root_R8mQ2vN7xL4pT9sK5wD1cF6hJ3yA0zB",
        MYSQL_PASSWORD: "mysql_K4vN8pQ2xT7mL5sR1wD9cF3hJ6yA0zB",
        MYSQL_USER: "hushle",
        DATABASE_URL: "mysql://hushle:mysql_K4vN8pQ2xT7mL5sR1wD9cF3hJ6yA0zB@mysql:3306/hushle",
        REDIS_URL: "redis://redis:6379",
        REDIS_KEY_PREFIX: "hushle:production",
        NEXTAUTH_URL: "https://play.example.test",
        NEXT_PUBLIC_SITE_URL: "https://play.example.test",
        TRUSTED_WEB_ORIGINS: "https://play.example.test,https://admin.example.test",
        RATE_LIMIT_ENABLED: "true",
        PASSWORD_BREACH_CHECK_ENABLED: "true",
        STATE_CHANGE_ORIGIN_POLICY: "strict",
        REALTIME_TOPOLOGY: "single-writer",
        REALTIME_REPLICA_COUNT: "1",
        ALLOW_ORIGINLESS_SOCKET_CLIENTS: "false",
        ADMIN_ACCESS_MODE: "external_gateway",
        ADMIN_ACCESS_FAIL_CLOSED: "true",
        ADMIN_ACCESS_ALLOW_LOCAL_DEV_BYPASS: "false",
        ADMIN_ACCESS_EMAIL_HEADER_NAME: "cf-access-authenticated-user-email",
        ADMIN_ACCESS_ALLOWED_EMAIL_DOMAINS: "example.test",
        AUTH_TRUST_HOST: "true",
        TRUST_PROXY: "true",
        PRODUCTION_CAPTCHA_POLICY: "turnstile",
        TURNSTILE_SITE_KEY: "site-key",
        TURNSTILE_SECRET_KEY: "turnstile_R8mQ2vN7xL4pT9sK5wD1cF6h",
        PRODUCTION_EMAIL_POLICY: "smtp",
        EMAIL_PROVIDER: "smtp",
        EMAIL_TOKEN_SECRET: "email_T7vN2pQ8xL4mR9sK5wD1cF6hJ3yA0zB",
        EMAIL_FROM: "Hushle <no-reply@hushle.test>",
        SMTP_HOST: "smtp.hushle.test",
        SMTP_PORT: "587",
        JOBS_ENABLED: "true",
        BACKUP_REMOTE_ENABLED: "true",
        BACKUP_S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
        BACKUP_S3_BUCKET: "hushle-production",
        BACKUP_S3_ACCESS_KEY_ID: "r2-access-key",
        BACKUP_S3_SECRET_ACCESS_KEY: "r2-secret-key",
    };
}

const valid = validateProductionEnvironment(validEnvironment());
assert.deepEqual(valid.errors, []);

const unsafe = validEnvironment();
unsafe.AUTH_SECRET = "replace_with_secret";
unsafe.NEXT_PUBLIC_SITE_URL = "http://localhost:3000/path";
unsafe.REALTIME_REPLICA_COUNT = "2";
unsafe.ADMIN_ACCESS_MODE = "public_login";
unsafe.ADMIN_ACCESS_ALLOW_LOCAL_DEV_BYPASS = "true";
unsafe.BACKUP_REMOTE_ENABLED = "false";
unsafe.STATE_CHANGE_ORIGIN_POLICY = "compatible";
const rejected = validateProductionEnvironment(unsafe);
assert.ok(rejected.errors.length >= 6);
assert.ok(rejected.errors.some((error) => error.includes("AUTH_SECRET")));
assert.ok(rejected.errors.some((error) => error.includes("single-writer")));
assert.ok(rejected.errors.some((error) => error.includes("ADMIN_ACCESS_MODE")));
assert.ok(rejected.errors.some((error) => error.includes("STATE_CHANGE_ORIGIN_POLICY")));
assert.equal(rejected.errors.join("\n").includes(unsafe.MYSQL_PASSWORD), false);

const acceptedRisk = validEnvironment();
acceptedRisk.PRODUCTION_CAPTCHA_POLICY = "disabled_risk_accepted";
acceptedRisk.PRODUCTION_EMAIL_POLICY = "disabled_risk_accepted";
acceptedRisk.EMAIL_PROVIDER = "disabled";
acceptedRisk.JOBS_ENABLED = "false";
const riskResult = validateProductionEnvironment(acceptedRisk);
assert.deepEqual(riskResult.errors, []);
assert.equal(riskResult.warnings.length, 2);

const wildcard = validEnvironment();
wildcard.TRUSTED_WEB_ORIGINS = "*";
assert.ok(validateProductionEnvironment(wildcard).errors.some((error) => error.includes("wildcard")));

const exampleResult = validateProductionEnvironment(parseEnvFile(".env.production.example"));
assert.ok(exampleResult.errors.some((error) => error.includes("placeholder")));

const fixtureDir = mkdtempSync(join(tmpdir(), "hushle-production-preflight-"));
try {
    const envPath = join(fixtureDir, "production.env");
    const cliSecret = validEnvironment().AUTH_SECRET;
    writeFileSync(
        envPath,
        Object.entries(validEnvironment()).map(([key, value]) => `${key}=${value}`).join("\n"),
        "utf8"
    );

    const passedCli = spawnSync(process.execPath, ["scripts/production-preflight.mjs", envPath], {
        encoding: "utf8",
    });
    assert.equal(passedCli.status, 0, passedCli.stderr);
    assert.match(passedCli.stdout, /Production preflight passed/);
    assert.equal(`${passedCli.stdout}${passedCli.stderr}`.includes(cliSecret), false);

    writeFileSync(envPath, `AUTH_SECRET=${cliSecret}\n`, "utf8");
    const failedCli = spawnSync(process.execPath, ["scripts/production-preflight.mjs", envPath], {
        encoding: "utf8",
    });
    assert.equal(failedCli.status, 1);
    assert.match(failedCli.stderr, /Production preflight failed/);
    assert.equal(`${failedCli.stdout}${failedCli.stderr}`.includes(cliSecret), false);
} finally {
    rmSync(fixtureDir, { recursive: true, force: true });
}

console.log("Production config preflight checks passed.");
