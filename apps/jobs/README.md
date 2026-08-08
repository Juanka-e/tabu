# Jobs

One-shot operational jobs that are invoked by cron, a container scheduler, or an
operator. The runtime does not run inside the web request process.

Audit retention is dry-run by default:

```bash
npm run jobs:audit-retention
```

Execution requires both an explicit flag and environment gate:

```bash
JOBS_ENABLED=true npm run jobs:run -- audit-retention execute
```

Live mutation also requires Redis so only one runtime can own the job lease.
The jobs container uses a separate, low database connection limit so one-shot
maintenance cannot consume the web process pool.

Payment recovery is a separate bounded job:

```bash
npm run jobs:run -- payment-reconciliation dry-run
JOBS_ENABLED=true npm run jobs:run -- payment-reconciliation execute
```

It queries only old `awaiting_payment` PayTR orders, stores a minimal provider
snapshot, and uses a Redis global lease. Provider mismatches and detected returns
open an admin review case; they never trigger a provider refund automatically.

The admin audit page has separate active and archive views. Production
scheduling still remains an explicit operator decision after the retention
window and archive view are accepted in the target environment.
