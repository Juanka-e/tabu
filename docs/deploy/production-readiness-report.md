# Production Readiness Report

Tarih: 30 Temmuz 2026

Kapsam:

- web uygulamasi ve admin paneli
- uye kayit/giris ve session guvenligi
- web, Socket.IO ve mobile API origin politikalari
- admin subdomain ve Cloudflare Access hazirligi
- Cloudflare Turnstile ve reCAPTCHA
- GA4 ve Google Search Console
- MySQL, Redis, audit, backup, realtime ve gozlemlenebilirlik

## Yonetici Ozeti

Genel sonuc: **kosullu hazir, public production acilisi icin henuz GO degil**.

Uygulamanin build, test, yetkilendirme, ekonomi guardrail, Docker, MySQL, Redis,
audit arsivleme ve backup temeli guclu. Buna karsilik public kullanici trafigi
almadan once asagidaki konular kapatilmalidir:

1. login denemeleri icin Redis destekli rate-limit
2. minimum 6 karakter olan parola politikasinin guclendirilmesi
3. e-posta dogrulama, sifre sifirlama ve transactional email saglayicisi
4. Turnstile production anahtarlari ve korunan akislarin bilincli aktivasyonu
5. Cloudflare Access kullanilacaksa origin kilidi ve guvenilen header zinciri
6. gercek production/staging TLS, DNS, cookie ve subdomain E2E testi
7. offsite backup upload ve gecici veritabanina restore kaniti
8. merkezi hata izleme ve alarm kanali

Kapali alpha icin e-posta dogrulama/sifre sifirlama gecici olarak manuel destek
akisi ile ertelenebilir. Acik public kayit icin ertelenmemelidir.

## Durum Anahtari

- **Hazir**: Kod, test ve deployment kontrati mevcut.
- **Kismi**: Temel mevcut; production ayari veya dis servis islemi gerekiyor.
- **Eksik**: Public acilis oncesi uygulanmasi gereken urun/guvenlik parcasi.
- **Operasyonel**: Kod disinda Cloudflare, DNS, bucket veya sunucu islemi gerekiyor.

## Mevcut Durum Matrisi

| Alan | Durum | Kisa karar |
| --- | --- | --- |
| Next.js production build | Hazir | Turbopack production build ve TypeScript kontrolleri mevcut |
| Admin RBAC | Hazir | Proxy, layout ve API seviyesinde admin kontrolu var |
| Admin Zero Trust | Kismi | Fail-closed gateway policy var; Cloudflare ve origin guven zinciri disarida kurulacak |
| Admin subdomain | Kismi | Exact origin/CSP temeli var; cift-host auth/cookie E2E tamamlanmadi |
| Web Socket.IO origin | Hazir | Exact allowlist, wildcard reddi ve production originless default-deny var |
| Mobile/public API CORS | Hazir | Production default-deny ve exact `API_ALLOWED_ORIGINS` var |
| HTTP CSRF/origin | Kismi | Same-origin kontrolu var; Origin ve Sec-Fetch-Site ikisi de yoksa istek kabul ediliyor |
| Uye kayit | Kismi | Unique email/username, bcrypt, captcha ve rate-limit var; parola politikasi zayif |
| Uye giris | Kismi | bcrypt, captcha, suspension ve 24 saat JWT var; login rate-limit yok |
| Email verification | Eksik | DB alani var, token/delivery/confirm akisi yok |
| Password reset | Eksik | Token, mail ve sifre yenileme akisi yok |
| Cloudflare Turnstile | Kismi | Client/server uygulamasi hazir; production key ve aktivasyon gerekiyor |
| reCAPTCHA v3 | Kismi | Alternatif provider kodu hazir; key ve aktivasyon gerekiyor |
| Google Search Console | Hazir/Kismi | Sitemap, robots, canonical ve HTML verification env destegi var; dis dogrulama yapilacak |
| GA4 | Eksik | GA4 tag, consent mode ve admin konfigurasyonu yok |
| Dahili product analytics | Hazir | PII'siz Redis gunluk aggregate temeli var; GA4 degildir |
| MySQL | Hazir | Persistent volume ve utf8mb4 mevcut |
| Redis/Valkey | Hazir | AOF, cache/rate-limit/coordination temeli ve fallback mevcut |
| Realtime yatay olcek | Kismi | Tek writer production icin uygun; cok replica room-state henuz desteklenmiyor |
| Audit retention | Hazir/Kismi | Hot-to-archive job var; archive purge politikasi operasyonel karar bekliyor |
| Offsite backup | Hazir/Kismi | R2/S3-compatible kod hazir; production upload/restore kaniti gerekiyor |
| Merkezi error tracking | Eksik | Sentry/OpenTelemetry benzeri bir servis bagli degil |

## Admin Paneli

### Mevcut korumalar

- `/admin` ve `/api/admin` proxy seviyesinde korunur.
- Session kullanicisinin rolu kritik server akislarinda DB'den tekrar okunur.
- Admin olmayan kullanici admin paneline ve admin API'lerine erisemez.
- `public_login`, `restricted_login` ve `external_gateway` modlari vardir.
- Production varsayilani `restricted_login` ve fail-closed davranistir.
- Sabit gateway header veya Cloudflare Access email header allowlist'i
  tanimlanabilir.
- Admin islemleri audit kayitlariyla izlenir.

### Cloudflare Access riski

Uygulama su anda Cloudflare Access JWT'sini kriptografik olarak dogrulamaz.
Yapilandirilmis header/email degerine guvenir. Bu model ancak:

1. origin internete dogrudan acik degilse,
2. trafik sadece Cloudflare/Nginx guven zincirinden geliyorsa,
3. istemcinin ayni header'i dogrudan enjekte etmesi edge tarafinda engelleniyorsa

guvenlidir.

Production onerisi:

1. `/admin*` ve `/api/admin*` Cloudflare Access arkasina alinmali.
2. Origin IP firewall, Cloudflare Tunnel veya Authenticated Origin Pulls ile
   kilitlenmeli.
3. Tercihen `Cf-Access-Jwt-Assertion` uygulama tarafinda Access JWKS ile
   dogrulanmali.
4. Sadece email header kontrolu kalici nihai cozum sayilmamali.
5. Bir acil durum break-glass admin proseduru dokumante edilmeli.

## Admin Subdomain

`admin.hushle.com` ayni web runtime'a yonlendirilebilir. Mevcut altyapi:

- `TRUSTED_WEB_ORIGINS` ile Socket.IO exact allowlist
- `CSP_STYLE_SOURCES`, `CSP_FONT_SOURCES`, `CSP_CONNECT_SOURCES`
- host ve forwarded-host farkindaligi
- admin gateway modlari

Ancak gercek cift-host production destegi tamamlanmis sayilmaz:

- tek bir `NEXTAUTH_URL` vardir
- host-only auth cookie nedeniyle ana site ve admin subdomain sessionlari
  birbirinden ayrilabilir
- cookie Domain/SameSite/Secure davranisi staging ortaminda test edilmedi
- callback ve logout yonlendirmeleri iki host icin E2E dogrulanmadi
- canonical host ve proxy host routing karari production DNS'e baglidir

Ilk public surum icin onerilen model:

1. `https://hushle.com/admin`
2. Cloudflare Access path policy
3. ihtiyac netlestiginde ayri bir subdomain migration branch'i

## CORS, Origin ve CSP

### Socket.IO

- `NEXT_PUBLIC_SITE_URL` canonical browser originidir.
- Ek browser originleri `TRUSTED_WEB_ORIGINS` ile exact olarak eklenir.
- `*`, path, query, credential ve desteklenmeyen protokol reddedilir.
- Production'da `ALLOW_ORIGINLESS_SOCKET_CLIENTS=false` varsayilir.
- Native mobil istemci auth kontrati tamamlanmadan originless erisim
  acilmamalidir.

### Mobile/public API

- `API_ALLOWED_ORIGINS` exact allowlist'tir.
- Wildcard reddedilir.
- Production'da bos allowlist browser cross-origin isteklerini default-deny
  eder.
- Native istemciler Origin gondermeyebilir; guven bearer token ve refresh-token
  kontratindan gelir.

### HTTP state-changing istekler

`POST`, `PUT`, `PATCH` ve `DELETE` isteklerinde Origin/Sec-Fetch-Site kontrolu
vardir. Ancak iki header da yoksa mevcut politika istegi kabul eder. Bu,
server-to-server ve test istemcilerini destekler; cookie tabanli public API'lerde
korumayi tamamen origin kontrolune birakmamak gerekir.

Public acilis oncesi karar:

1. browser cookie endpointlerinde Origin yoksa fail-closed davranis veya
   Auth.js CSRF token kontrati zorunlu kilinmali
2. gercek proxy arkasinda `Host`, `X-Forwarded-Host` ve
   `X-Forwarded-Proto` spoof senaryolari test edilmeli

### CSP

- nonce tabanli `script-src` ve `strict-dynamic`
- `frame-ancestors 'none'`
- `object-src 'none'`
- production HTTPS icin `upgrade-insecure-requests`
- external font/style/connect exact origin ayarlari
- YouTube ve Cloudflare Turnstile frame destegi
- Turnstile challenge originine connect destegi

Bu branch ile Turnstile CSP ve Docker env parity eksikleri kapatildi.

## Uye Kayit ve Giris

### Hazir olanlar

- Credentials tabanli Auth.js
- username ve normalize email uniqueness
- bcrypt cost 10
- kayitta IP bazli Redis destekli rate-limit: 5 deneme / 10 dakika
- register/login captcha entegrasyonu
- suspension kontrolu
- 24 saat JWT session
- kritik server akislarinda kullaniciyi DB'den tekrar dogrulama
- basarili kayit/giris sinyallerinin server tarafinda tutulmasi

### Acik riskler

1. Login endpointinde Redis destekli deneme limiti yok.
2. Captcha varsayilan olarak kapali ve `onLogin=false`.
3. Minimum parola uzunlugu 6; public servis icin yetersiz.
4. Email dogrulama tokeni ve outbound email yok.
5. Sifre unuttum/sifirlama yok.
6. Admin MFA/WebAuthn yok.
7. Credential stuffing ve compromised-password kontrolu yok.

Onerilen minimum:

- login icin IP + normalize username keyed rate-limit
- en az 10-12 karakter parola veya uzun passphrase politikasi
- mevcut hesaplar icin zorunlu sifre migrasyonu yerine yeni sifrelerde politika
- tek kullanimlik, hash'li, sureli email verification/reset tokenlari
- transactional email provider
- adminler icin Cloudflare Access MFA; daha sonra uygulama ici WebAuthn

## Cloudflare Turnstile

Kod seviyesi destek **mevcut**:

- provider: `turnstile`
- modlar: invisible, managed, non-interactive
- server-side Siteverify
- action eslestirmesi
- remote IP aktarimi
- idempotency key
- register, login, room create ve guest join bazinda ayri ac/kapat
- admin system settings ve Integration Hub readiness gorunumu
- production'da zorunlu hard-fail
- Cloudflare test key'leriyle smoke test

Bu branch ile production web container'a:

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- reCAPTCHA alternatif key'leri

aktarilir ve CSP Turnstile originini destekler.

Mevcut local durum:

- Turnstile key'leri bos
- captcha varsayilan olarak disabled
- dolayisiyla localde aktif koruma yok

Production aktivasyon sirasi:

1. Cloudflare dashboard'da production ve staging hostname'lerini ayir.
2. Site/secret key'leri secret store veya `.env.production` ile ver.
3. Once register ve room create akislarini ac.
4. Login rate-limit eklendikten sonra login Turnstile'i ac.
5. Guest join icin bot trafigi gorulmeden zorunlu challenge acma.
6. Managed fallback ve hata oranlarini izle.

## Google Search Console ve SEO

Mevcut:

- canonical metadata
- Open Graph/Twitter metadata
- `/robots.txt`
- `/sitemap.xml`
- oyun odalari icin noindex
- public olmayan route'larin robots disallow listesi
- `GOOGLE_SITE_VERIFICATION` ile HTML meta verification destegi

Search Console iki yolla kullanilabilir:

1. Onerilen: Cloudflare DNS TXT ile domain property dogrulamasi. Kod gerekmez.
2. Alternatif: `GOOGLE_SITE_VERIFICATION` degeriyle HTML meta dogrulamasi.

Disarida yapilacaklar:

- Search Console property acma
- DNS veya HTML token dogrulamasi
- sitemap gonderme
- canonical URL'nin production domainle eslestigini kontrol etme

## GA4 ve Analytics

GA4 destegi su anda **yoktur**:

- `gtag.js` veya Google Tag Manager ekli degil
- GA4 measurement ID env alani yok
- consent mode/CMP yok
- admin panelinde GA4 readiness karti yok

Mevcut `PRODUCT_ANALYTICS_ENABLED` GA4 degildir. PII'siz ve gunluk Redis
aggregate tutan dahili urun telemetrisidir. Kelime analytics de server-owned
gameplay aggregate'idir.

GA4 eklenmeden once:

1. hangi eventlerin Google'a gidecegi belirlenmeli
2. username, room code, user ID, IP ve serbest metin gonderilmemeli
3. KVKK/cookie consent karari verilmeli
4. Consent Mode v2 veya cookieless olcum karari dokumante edilmeli
5. development/staging trafigi production property'den ayrilmali
6. CSP ve ad-blocker hata davranisi ana oyunu etkilememeli

Onerilen ayri branch:

`feature/privacy-aware-ga4-and-search-integrations`

## Veri, Redis ve Realtime

### MySQL

- source of truth
- utf8mb4
- persistent Docker volume
- Prisma migration/build kontrati
- connection limit ayari

### Redis/Valkey

- AOF everysec
- shared cache
- distributed rate-limit
- capacity heartbeat
- telemetry aggregate
- gecici coordination
- ulasilamazsa guvenli alanlarda process-local fallback

Rate-limit Redis arizasinda process-local moda duser. Tek app replica icin
islevseldir; cok replica korumasi olarak yeterli degildir.

### Realtime

Room state process-localdir. Production topolojisi:

- `REALTIME_TOPOLOGY=single-writer`
- `REALTIME_REPLICA_COUNT=1`

Redis adapter ve ownership temeli bulunsa da room-state sharing/forwarding
tamamlanmadan realtime app replica sayisi artirilmamalidir.

## Audit ve Backup

### Audit

- admin ve kritik kullanici islemleri audit tablosuna yazilir
- siradan finalize olaylari Redis rollup'a alinabilir
- hot audit kayitlari job ile archive tablosuna tasinabilir
- archive kayitlari otomatik purge edilmez

Production kararlari:

- hot retention gunu
- archive retention ve hukuki saklama suresi
- manuel legal hold
- archive export/purge yetkisi

### Backup

Kod seviyesi:

- local gzip MySQL dump
- SHA-256
- S3-compatible offsite upload
- Cloudflare R2, Amazon S3 ve benzer servisler
- remote size dogrulamasi
- checksum dogrulamali restore
- gecici DB restore smoke testi

Production hazirlik kaniti ancak su uc islem gercekte tamamlaninca verilir:

1. production benzeri backup
2. private offsite bucket upload
3. gecici DB'ye basarili restore ve tablo kontrolu

## Observability ve Operasyon

Mevcut:

- token korumali `/api/health`
- Redis latency/readiness
- realtime topology ve ownership status
- capacity/admission health
- telemetry ve analytics sayaçlari
- admin Integration Hub

Eksik:

- merkezi error tracking
- log aggregation
- uptime probe ve alarm escalation
- CPU/RAM/disk/DB connection dashboard
- on-call bildirim kanali

Minimum onerilen:

- Sentry veya OpenTelemetry tabanli error tracking
- Uptime Kuma/Better Stack benzeri external probe
- host ve container metricleri
- disk ve backup failure alarmi
- Redis fallback ve audit fallback sayaclari icin alarm

## Public Go-Live Kapilari

### P0

- [ ] Production secret/env dosyasi secret store ile hazir
- [ ] `AUTH_SECRET`, health token ve DB sifreleri uzun ve benzersiz
- [ ] Login distributed rate-limit
- [ ] Guclu yeni parola politikasi
- [ ] Turnstile key ve aktif flow karari
- [ ] Email verification + password reset veya yazili kapali-alpha istisnasi
- [ ] Cloudflare Access/origin lock veya admin ayni-origin guvenlik karari
- [ ] Production TLS/DNS/cookie/subdomain E2E
- [ ] Offsite backup + restore smoke kaniti
- [ ] Merkezi error tracking ve uptime alarmi
- [ ] Tek realtime writer deployment dogrulamasi

### P1

- [ ] GA4 privacy/consent tasarimi
- [ ] Search Console property ve sitemap kaydi
- [ ] Admin MFA/WebAuthn
- [ ] Archive purge/legal hold politikasi
- [ ] Load test ve kapasite esikleri
- [ ] Incident/break-glass tatbikati

## Dogrulama Komutlari

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:web-launch-readiness:core
npm run test:web-launch-readiness:integration
npm run test:turnstile-smoke
npm run test:csp
npm run test:web-origin-policy
npm run test:admin-access-gateway
npm run test:auth-redirect-security
npm run test:branding-seo-settings
npm audit --omit=dev --audit-level=high
```

Gercek production readiness yalniz local test sonucu degildir. Staging
hostname, Cloudflare policy, TLS, secret store, backup bucket ve alarm kanali
birlikte dogrulanmalidir.
