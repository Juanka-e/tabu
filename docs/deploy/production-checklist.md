# Production Checklist

Ubuntu 24.04 üzerinde hedef sade model:

1. Cloudflare edge
2. Nginx reverse proxy
3. Tek Next.js + Socket.IO app container
4. MySQL container
5. Redis container
6. GitHub Actions deploy

## İlk Kurulum

1. `docs/deploy/overview.md` dosyasını oku.
2. Sunucuda Docker ve Compose kur.
3. `/srv/hushle/app` klasörünü hazırla.
4. `.env.production` dosyasını sunucuda oluştur.
5. Cloudflare Origin Certificate `.pem` ve key dosyalarını kalıcı konuma koy.
6. `docker compose --env-file .env.production -f docker-compose.yml config`
   komutuyla compose yapılandırmasını doğrula.
7. İlk ayağa kaldırmayı manuel yap.

## GitHub Actions Secrets

1. `PROD_HOST`
2. `PROD_PORT`
3. `PROD_USER`
4. `PROD_DEPLOY_PATH`
5. `PROD_SSH_PRIVATE_KEY`

## Zorunlu Env Değerleri

1. `DATABASE_URL`
2. `AUTH_SECRET`
3. `NEXTAUTH_URL`
4. `NEXT_PUBLIC_SITE_URL`
5. `MYSQL_ROOT_PASSWORD`
6. `MYSQL_PASSWORD`
7. `HEALTHCHECK_TOKEN`
8. `REDIS_URL`
9. `INSTANCE_ID=hushle-app-1`
10. `REALTIME_TOPOLOGY=single-writer`
11. `REALTIME_REPLICA_COUNT=1`
12. `MATCH_FINALIZE_TELEMETRY_ROLLUP_ENABLED=true`
13. `TELEMETRY_ROLLUP_RETENTION_DAYS=45`
14. Urun analytics acilacaksa `PRODUCT_ANALYTICS_ENABLED=true`
15. `PRODUCT_ANALYTICS_RETENTION_DAYS=45`
16. Kelime liveops olcumu acilacaksa `WORD_ANALYTICS_ENABLED=true`
17. `WORD_ANALYTICS_RETENTION_DAYS=45`

## Deploy Öncesi

1. `main` branch temiz ve build alıyor mu kontrol et.
2. `npm run build`
3. `npm run test:realtime-topology`
4. `npm run test:telemetry-rollup`
5. Kritik smoke testleri çalıştır:
   - `npm run test:distributed-coordination`
   - `npm run test:room-capacity-controls`
   - `npm run test:economy-guardrails`
   - `npm run test:word-category-selection-ui`
   - `npm run test:card-flip-settings`
6. Nginx upstream'inin yalnız `app:3000` içerdiğini doğrula.
7. Compose tarafında tek `app` container çalıştığını doğrula.
8. MySQL backup cron aktif mi kontrol et.

## Deploy Sonrası

1. Health endpointini kontrol et.
2. `realtime.topology.mode=single-writer` olduğunu doğrula.
3. `realtime.topology.declaredReplicaCount=1` olduğunu doğrula.
4. `realtime.topology.multiInstanceReady=false` bekle; bu bir hata değildir.
5. Admin login akışını kontrol et.
6. Oda oluşturma ve odaya dönme akışını kontrol et.
7. Redis bağlantısı ve rate-limit fallback loglarını izle.
8. Nginx TLS zinciri ve Cloudflare origin handshake kontrolü yap.
9. Admin kapasite kartında instance, oda, oyuncu ve event-loop verisini kontrol et.
10. Admission `closed` iken mevcut oyuncunun reconnect olabildiğini kontrol et.
11. `telemetry.matchFinalize` altında recorded ve audit fallback sayaçlarını izle.
12. Audit fallback sürekli artıyorsa Redis erişimini kontrol et.

## Realtime Ölçekleme Engeli

Aktif oda state'i process-local kaldığı sürece `app` replica sayısını artırma.
Redis adapter veya ownership lease özelliğini açmak bu kuralı değiştirmez.
Geçiş koşulları:

1. `docs/architecture/adr-003-single-realtime-writer-topology.md` içindeki
   multi-instance migration gate tamamlanmalı.
2. Polling kullanılacaksa gerçek load-balancer affinity doğrulanmalı.
3. Owner-aware command forwarding ve owner failure davranışı uygulanmalı.
4. Reconnect, failover, rolling deploy ve yük testleri geçmeli.

## Rollback

1. Sunucuda bir önceki release arşivini sakla.
2. Geri dönülecek release'i deploy path'e aç.
3. `./scripts/ops/deploy.sh` komutunu tekrar çalıştır.
4. DB migration gerektiren deploylarda rollback öncesi backup al.

## Backup Disiplini

1. Günlük local MySQL dump
2. Haftalık restore testi
3. Sonraki adımda offsite kopya

## Notlar

1. Redis source of truth değildir; cache, rate limit ve koordinasyon katmanıdır.
2. Local geliştirme Redis olmadan devam edebilir.
3. `/admin` aynı origin üstünde kalırsa CORS ve auth riski daha düşüktür.
4. Hem `/admin` hem subdomain uzun süre desteklenecekse
   `subdomain-and-cors.md` zorunlu tasarım girdisidir.
