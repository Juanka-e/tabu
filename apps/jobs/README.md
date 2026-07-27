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

Do not schedule audit retention in production until the admin archive read path
is available and accepted. Execution is safe and reversible at the storage
level, but archived rows leave the current hot-audit admin view.
