# Hushle

Hushle is the Next.js game and admin panel project in this repository. It includes the live room flow, Socket.IO game server, admin content tools, and the evolving cosmetic card system.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run lint
npm run build
npm run db:sync
```

Infra-only local development:

```bash
docker compose -f docker-compose.dev.yml up -d
```

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
- See `docs/guides/deployment-security-guide.md` for the security topology and Cloudflare/Nginx notes.
- See `docs/guides/deployment-ops-runbook.md` for Ubuntu 24.04, GitHub Actions deploy, local-dev split, and MySQL backup flow.
