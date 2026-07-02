# Ubuntu 24.04 And GitHub Actions

Sunucuda minimum:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 curl git
sudo systemctl enable --now docker
```

Deploy klasoru:

```bash
sudo mkdir -p /srv/hushle/app
sudo chown -R $USER:$USER /srv/hushle
```

GitHub Actions workflow:

- `.github/workflows/deploy-production.yml`

Bu workflow:

1. release arsivi olusturur
2. SSH ile sunucuya yollar
3. sunucuda `scripts/ops/deploy.sh` calistirir

Gerekli GitHub secrets:

1. `PROD_HOST`
2. `PROD_PORT`
3. `PROD_USER`
4. `PROD_DEPLOY_PATH`
5. `PROD_SSH_PRIVATE_KEY`

Onerilen branch akisi:

1. `feature/*` -> gelistirme
2. `develop` -> CI dogrulama
3. `main` -> production deploy

Not:

- Production Environment kullanip manual approval eklemek mantikli.
- Sunucuda `.env.production` ve `nginx/ssl/*.pem` dosyalari repodan bagimsiz kalici durmali.
