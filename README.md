# Hushle

Hushle is the Next.js game and admin panel project in this repository. It includes the live room flow, Socket.IO game server, admin content tools, and the evolving cosmetic card system.

## Local Development

```bash
npm install
npm run infra:up
npm run db:sync
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run lint
npm run build
npm run db:sync
npm run jobs:audit-retention
```

Infra helpers:

```bash
npm run infra:up
npm run infra:down
npm run infra:logs
npm run infra:status
npm run test:redis
```

Infra-only local development:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Notes:

- Development and production stacks use named Docker volumes for MySQL and Redis.
- Container restart or `docker compose down` does **not** wipe data.
- Data is removed only if you explicitly remove volumes, for example with `docker compose down -v` or manual volume deletion.
- Local MySQL listens on `127.0.0.1:3307` by default; `.env.example` matches the Docker credentials.
- Local Redis listens on `127.0.0.1:6381` by default through Docker; `REDIS_PORT` can override the host port and the app reads it from `REDIS_URL`.
- Redis uses AOF persistence, but MySQL remains the business source of truth.
- Audit retention is dry-run by default. Live archival requires
  `JOBS_ENABLED=true`, explicit execute mode, and an available Redis lease.
- Keep production audit retention disabled until the admin archive read path is
  available; archived rows are not shown by the current hot-audit view.
- Web and jobs processes have separate database pool limits. Jobs default to
  three connections through `JOBS_DATABASE_CONNECTION_LIMIT`.

## Production Shape

Recommended production stack:

1. Cloudflare
2. Nginx
3. Hushle app container
4. MySQL container
5. Redis container

Notes:

- Only Nginx should publish `80/443`.
- The app should stay private on the Docker network.
- Cloudflare Origin Certificate files should be mounted into `nginx/ssl/`.
- Redis is provisioned now for cache, rate-limit, session coordination, and future realtime scaling work.

## Docker Compose

1. Copy `.env.production.example` to `.env.production`.
2. Fill in real secrets and domain values.
3. Put Cloudflare origin cert files here:
   - `nginx/ssl/origin-cert.pem`
   - `nginx/ssl/origin-key.pem`
4. Start the stack:

```bash
docker compose --env-file .env.production up -d --build
```

The compose stack includes:

- `app`
- `mysql`
- `redis`
- `nginx`

## Deployment Notes

- In Docker, the app must bind `HOST=0.0.0.0`. It is still private because no app port is published.
- Outside Docker, a host-level reverse proxy setup can bind the app to `127.0.0.1`.
- MySQL is the current source-of-truth database. Do not switch to PostgreSQL during the `apps/` modularization phase; keep schema and operational flow stable first.
- See `docs/guides/deployment-security-guide.md` for the security topology and Cloudflare/Nginx notes.
- See `docs/guides/deployment-ops-runbook.md` for Ubuntu 24.04, GitHub Actions deploy, local-dev split, and MySQL backup flow.
