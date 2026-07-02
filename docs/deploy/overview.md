# Deployment Overview

Hafif model:

1. localde app `npm run dev`
2. local infra icin `docker-compose.dev.yml`
3. production'da `docker-compose.yml`
4. deploy tetigi GitHub Actions
5. hedef sunucu Ubuntu 24.04
6. reverse proxy Nginx
7. edge katmani Cloudflare

Temel kural:

- local gelistirme ile production orkestrasyonu ayri kalir
- localde her degisiklikte tam Docker build beklenmez
- Redis yoksa uygulama memory fallback ile calismaya devam eder
- production'da sadece Nginx `80/443` acik eder
- app, MySQL ve Redis private Docker networkte kalir

Ilgili dosyalar:

- `docker-compose.dev.yml`
- `docker-compose.yml`
- `scripts/ops/deploy.sh`
- `docs/guides/deployment-security-guide.md`
- `docs/guides/deployment-ops-runbook.md`
