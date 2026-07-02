# Production Checklist

Ubuntu 24.04 uzerinde hedef sade model:

1. Cloudflare edge
2. Nginx reverse proxy
3. Next.js app container
4. MySQL container
5. Redis container
6. GitHub Actions deploy

## İlk kurulum

1. `docs/deploy/overview.md` oku.
2. Sunucuda Docker ve Compose kur.
3. `/srv/hushle/app` klasorunu hazirla.
4. `.env.production` dosyasini sunucuda olustur.
5. Cloudflare Origin Certificate `.pem` ve key dosyalarini sunucuda kalici koy.
6. `docker compose --env-file .env.production -f docker-compose.yml config` ile compose dogrula.
7. Ilk ayağa kaldırmayı manuel yap.

## GitHub Actions secrets

1. `PROD_HOST`
2. `PROD_PORT`
3. `PROD_USER`
4. `PROD_DEPLOY_PATH`
5. `PROD_SSH_PRIVATE_KEY`

## Env zorunluları

1. `DATABASE_URL`
2. `AUTH_SECRET`
3. `NEXTAUTH_URL`
4. `NEXT_PUBLIC_SITE_URL`
5. `MYSQL_ROOT_PASSWORD`
6. `MYSQL_PASSWORD`
7. `HEALTHCHECK_TOKEN`
8. `REDIS_URL`

## Deploy öncesi

1. `main` branch temiz ve build alıyor mu kontrol et.
2. `npm run build`
3. Kritik smoke testler:
   - `npm run test:distributed-coordination`
   - `npm run test:word-category-selection-ui`
   - `npm run test:card-flip-settings`
4. MySQL backup cron aktif mi kontrol et.

## Deploy sonrası

1. Health endpoint kontrol et.
2. Admin login kontrol et.
3. Oda oluştur / odaya dön akışı kontrol et.
4. Redis bağlantısı ve rate limit fallback loglarını izle.
5. Nginx TLS zinciri ve Cloudflare origin handshake kontrol et.

## Rollback yaklaşımı

Bu yapıda rollback en temiz şekilde release archive veya git tag bazlı olur.

1. Sunucuda bir onceki release arşivini sakla.
2. Geri dönülecek release'i deploy path'e aç.
3. `./scripts/ops/deploy.sh` tekrar çalıştır.
4. DB migration gerektiren deploylarda rollback öncesi backup al.

## Backup disiplini

1. Günlük local MySQL dump
2. Haftalık restore testi
3. Sonraki adımda offsite kopya

## Notlar

1. Redis source of truth değildir; cache / rate limit / coordination katmanıdır.
2. Local geliştirme Redis olmadan devam edebilir.
3. `/admin` aynı origin üstünde kalırsa CORS ve auth riski daha düşüktür.
4. Hem `/admin` hem subdomain uzun süre desteklenecekse `subdomain-and-cors.md` notları zorunlu tasarım girdisidir.
