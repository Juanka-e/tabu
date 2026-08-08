# Tamamlanan Isler

> Son guncelleme: 31 July 2026
> Durum: aktif completed log

## Yayinda Olan Temel Sistemler
- authenticated dashboard shell
- in-game dashboard overlay
- store, inventory, equip, purchase akislari
- bundle / discount / coupon altyapisi
- cosmetic template/image modeli
- room card cosmetics broadcast
- runtime system settings
- captcha entry gates
- admin table foundation
- moderation foundation
- economy liveops controls
- user email foundation
- admin user operations
- admin audit viewer
- coin grant campaigns
- support desk foundation

## Tamamlanan Feature Branch'ler

### 1. `feature/liveops-system-settings-foundation`
- runtime config omurgasi
- maintenance, MOTD, feature toggles
- admin system settings ekrani

### 2. `feature/security-entry-gates`
- Turnstile / reCAPTCHA gate altyapisi
- register / login / room create / guest join enforcement

### 3. `feature/admin-table-foundation`
- ortak admin header, toolbar, pagination, selection yapisi
- words / shop-items / promotions entegrasyonu

### 4. `feature/moderation-foundation`
- suspend / reactivate / note modeli
- `/admin/users`
- moderation event kaydi

### 5. `feature/economy-liveops-controls`
- runtime reward ve fiyat carpanlari
- bundle/coupon/campaign kill switch'leri
- shop liveops durumu

### 6. `feature/user-email-foundation`
- yeni kayitlarda email zorunlu
- legacy hesap uyumu
- profile ve admin users email gorunumu

### 7. `feature/admin-user-operations`
- admin coin ekle / dus operasyonu
- wallet adjustment kayit modeli
- reason zorunlulugu ve audit baglantisi
- negatif bakiye korumasi

### 8. `feature/admin-audit-viewer`
- `/admin/audit` ekrani
- action / resource / role / search filtreleri
- audit metadata ozet gorunumu

### 9. `feature/coin-grant-campaigns`
- `/admin/coin-grants` campaign ve code yonetimi
- login kullanici coin code redeem akisi
- budget / duplicate claim / code limit korumalari

### 10. `feature/support-desk-foundation`
- full-page dashboard ve in-game overlay icin ortak support girisi
- kullanici ticket olusturma ve reply akisi
- admin support kuyrugu, assignee, public reply ve internal note
- support aksiyonlari icin audit log baglantisi

### 11. `feature/cosmetic-render-upgrade`
- katalogda asil asset'ten bagimsiz nullable `thumbnailUrl`
- grid ve discovery yuzeylerinde memoized, statik thumbnail renderer
- ilk 24 urun ve kullanici kontrollu batch genisletme
- animasyonlu buyuk renderer'i yalniz detay modalinda mount etme

### 12. `feature/admin-cosmetic-authoring`
- frame, card face ve card back icin test edilen hazir template preset'leri
- preset'in etkisini aciklayan ve yalniz render alanlarini degistiren admin akisi
- mevcut resolver ile anlik canli preview
- preset katalogunun shop item write schema ile otomatik dogrulanmasi

### 13. `feature/analytics-event-foundation`
- versiyonlu ve guven seviyeli product event kontrati
- PII ve ham event satiri tutmayan Redis gunluk aggregate
- server-verified store metrikleri ve client-observed navigation siniri
- analytics arizasini business request'inden ayiran dropped telemetry

### 14. `feature/word-analytics-liveops`
- dogru, tabu, pas ve timeout icin server-owned kelime olcumu
- oyuncu, oda ve kelime metni tutmayan Redis gunluk aggregate
- pause suresini dislayan exposure ve cok kategorili aggregate
- admin kelime listesinde 7/30 gunluk bounded performans gorunumu
- dusuk ornek uyarisi ve otomatik yaptirim uygulamayan liveops siniri

### 15. `feature/release-ops-docs`
- release gate, kanit kaydi ve production deploy gercegi
- rollback/incident runbook'u ve launch-day checklist
- production deploy concurrency, release SHA ve archive checksum
- analytics env degerlerinin Compose app container parity'si
- workflow, Compose, health ve dokuman kontrati regresyon testi

### 16. `docs/encoding-cleanup`
- cift encode edilmis tasarim prototiplerinin UTF-8 onarimi
- stale UTF-16 lint/typecheck raporlarinin kaldirilmasi
- UTF-8 EditorConfig ve kalici encoding integrity testi
- mevcut ASCII socket event dokumani ve escaped legacy compatibility alias'lari

### 17. `feature/wallet-ledger-foundation`
- atomik coin bakiye ve immutable ledger yazimi
- tum mevcut coin kaynaklarinin merkezi servise tasinmasi
- lazy legacy snapshot ve yeni hesap opening kaydi
- eszamanli magaza harcamalarinda satir kilidi
- admin ledger history ve bakiye reconciliation gorunumu
- MySQL concurrency/idempotency CI testi

### 18. `feature/mobile-api-foundation`
- bagimsiz ve surumlu Node HTTP API runtime
- paylasilan `@hushle/api-contracts` paketi
- health/meta, exact CORS, request ID ve security header davranisi
- varsayilan kapali Docker API profili
- runtime HTTP ve package boundary regresyon testi
- bearer auth sonrasina bagli kademeli route migration plani
- opaque access/refresh token, rotation, reuse family revoke, cihaz oturumu
  listeleme/revoke ve mobile auth retention temeli
- ortak player-core servisi, `/v1/me`, profile update ve transaction icinde
  web/mobile audit parity

### 19. `feature/email-verification-foundation`
- `off | optional | required_for_new_accounts` runtime modu
- provider bagimsiz transactional outbox ve Nodemailer SMTP adaptoru
- hash'li, 24 saatlik, tek kullanimlik token ve resend invalidation
- verification-only session icin ortak web/mobile/socket capability politikasi
- Mailpit local gelistirme servisi ve SES SMTP uyumlu production env kontrati
- Redis lease zorunlu delivery/retention job'lari
- bounded outbox, token ve pending hesap retention
- admin readiness gorunumu ve zorunlu mod icin fail-closed config kontrolu

### 20. `chore/prisma-migration-baseline-and-deploy-gates`
- mevcut MySQL semasindan version-controlled Prisma baseline
- mevcut DB icin backup, restore smoke ve sifir drift zorunlu baseline komutu
- app startup'ina bagli olmayan tek-seferlik Compose migration servisi
- migration basarisizliginda app rollout'unu durduran deploy gate
- CI'da temiz DB uzerinde `prisma migrate deploy` kontrati

### 21. `feature/release-compatibility-and-render-versioning`
- legacy v0 ve current v1 icin Socket.IO handshake compatibility penceresi
- desteklenmeyen istemciyi room handler'larindan once reddeden server gate
- yeni istemcide kontrollu sayfa yenileme mesaji
- card face/back icin gercek render spec registry ve v1 parser dispatch
- bilinmeyen snapshot version'inda v1 fallback metadata'si
- desteklenmeyen render version'ini yeni item'a yazmayi engelleyen admin API gate

### 22. `fix/restore-cutover-and-schema-ops-lock`
- aktif production DB'ye in-place restore'u fail-closed kapatma
- backup, restore ve migration icin ortak host-level schema operation lock
- izole restore, migration-forward, smoke ve kontrollu DB cutover runbook'u
- backup sonrasi kayip veri araligi ile Redis/process-local state sinirinin kaydi
- lock contention ve gercek dump/restore entegrasyon testleri

### 23. `feature/email-delivery-operations-and-bounce-handling`
- sureli, atomik DB outbox claim ve coken worker recovery akisi
- idempotent provider event ve hard-bounce/complaint suppression temeli
- suppression-aware fail-closed teslimat davranisi
- admin dead-letter gorunumu, kontrollu retry ve audit
- MySQL concurrency, statik guvenlik ve admin Playwright dogrulamalari

### 24. `feature/production-config-preflight`
- secret degerlerini loglamayan fail-closed production env preflight
- secret kalite/benzersizlik, HTTPS origin ve DB credential parity kontrolleri
- captcha, e-posta, admin gateway ve offsite backup icin acik politika kararlari
- tek realtime writer, rate limit, Redis namespace ve proxy trust guard'lari
- deploy oncesi otomatik gate, fixture testleri ve operator runbook'u

### 25. `fix/strict-state-change-origin-policy`
- production cookie API'lerinde eksik Origin icin fail-closed davranis
- exact trusted-origin allowlist ve cross-site Fetch Metadata reddi
- production'da spoof edilebilir forwarded-host header'larindan guven uretmeme
- development script uyumlulugu ile mobile bearer API ayriminin korunmasi
- deploy preflight gate ve spoof/missing-header regresyon testleri

### 26. `feature/central-observability-foundation`
- web, API ve jobs icin ortak provider-neutral observability paketi
- format kontrollu request ID ve web response/downstream korelasyonu
- PII/secret redaksiyonlu bounded structured JSON event kontrati
- gameplay'i bozmayan exporter failure izolasyonu ve aggregate status
- runtime health/admin capacity gorunumu, regresyon testleri ve operator rehberi

### 27. `feature/observability-exporter-and-alerting`
- HTTPS bearer-auth collector icin bounded batch/queue exporter
- web, API, jobs ve Next instrumentation runtime konfigurasyonu
- exporter teslim, kuyruk, drop ve failure aggregate admin/health gorunumu
- production preflight, Docker env, alarm esikleri ve incident runbook'u

### 28. `feature/google-oauth-account-linking-foundation`
- token saklamayan provider-neutral OAuth account modeli ve Auth.js adapter'i
- Google verified-email kontrolu ve otomatik ayni-email link reddi
- Settings icinden explicit link/unlink ve son giris yontemi korumasi
- nullable parola icin web/mobile guvenli fallback davranisi
- Apple ve yeni provider'lar icin registry, env ve production preflight kontrati

### 29. `feature/adaptive-turnstile-launch-policy`
- Managed Turnstile varsayilani ve oyuncu niyetinde tokenless provider prewarm
- exact action/production hostname, token boyutu ve Siteverify timeout kontrolleri
- production preflight hostname kontrati ve Docker env parity
- anlasilir admin akis ac/kapat metinleri, server policy ve Playwright regresyonlari

## Tamamlanan Docs-Only Branch'ler
- `docs/cleanup-roadmap-and-encoding`
  - stale roadmap ve tarihsel planning copleri temizlendi
  - aktif dokumanlar sadelestirildi ve karar odakli hale getirildi

## Tamamlanan Onemli Fix Branch'leri
- room regression fix zinciri
- dependency `undici` advisory hotfix
- room hydration ve single inspector yetki duzeltmeleri

## Not
Bu dosya sadece kalici olarak degerli tamamlanmis dilimleri tutar.
Eski gunluk debug notlari ve artik tekrar bakilmayan checklist'ler burada tutulmaz.
