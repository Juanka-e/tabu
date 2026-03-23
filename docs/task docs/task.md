# Gorev Kaydi

> Son guncelleme: 23 March 2026
> Durum: aktif execution log

## Cekirdek Kurallar
- Her branch tek konu tasir.
- Implementasyon sonunda `review`, `test`, `refactor`, `docs`, `push` kapanisi zorunludur.
- PR olmadan once branch kapsam disina cikilmaz.

## Guncel Tamamlanan Feature Branch'ler

### `feature/liveops-system-settings-foundation`
- system settings modeli
- runtime banner / maintenance
- feature gates
- verification: `test:system-settings`, lint, tsc, build, audit

### `feature/security-entry-gates`
- captcha verification katmani
- register/login/room create/guest join enforcement
- verification: `test:captcha-security`, lint, tsc, build, audit

### `feature/admin-table-foundation`
- ortak admin tablo/list omurgasi
- words, shop-items, promotions entegrasyonu
- verification: `test:admin-table-foundation`, lint, tsc, build

### `feature/moderation-foundation`
- suspend/reactivate/note
- `/admin/users`
- login/session/socket enforcement
- verification: `test:moderation-foundation`, prisma push, prisma generate, lint, tsc, build, audit

### `feature/economy-liveops-controls`
- match/store liveops ayarlari
- fiyat/reward multiplier'lari
- coupon/bundle/campaign runtime kontrolleri
- verification: `test:system-settings`, `test:economy-liveops`, `test:store-pricing`, lint, tsc, build, audit

### `feature/user-email-foundation`
- register email zorunlulugu
- legacy users nullable email uyumu
- settings ve admin users email gorunumu
- verification: `test:user-email-foundation`, prisma push, prisma generate, lint, tsc, build, audit

### `feature/admin-user-operations`
- admin coin ekle / dus operasyonlari
- `wallet_adjustments` modeli
- audit ve reason zorunlulugu
- verification: `test:admin-user-operations`, prisma push, prisma generate, lint, tsc, build, audit

### `feature/admin-audit-viewer`
- `/admin/audit` ekrani
- action/resource/role/search filtreleri
- pagination ve metadata ozet gorunumu
- verification: `test:admin-audit-viewer`, lint, tsc, build, audit

### `feature/coin-grant-campaigns`
- `/admin/coin-grants` ekrani
- campaign/code admin API'leri
- `/api/coin-grants/redeem` kullanici claim akisi
- redeem sonrasi wallet live update
- kullanilmis kayitlar icin pasif / arsiv modeli
- verification: `test:coin-grant-campaigns`, prisma push, prisma generate, lint, tsc, build, audit

### `feature/support-desk-foundation`
- dashboard + overlay support girisi
- kullanici ticket/reply akisi
- admin support kuyrugu ve note/reply sistemi
- verification: `test:support-desk-foundation`, prisma push, prisma generate, lint, tsc, build, audit

### `feature/system-notifications-foundation`
- dashboard bell/inbox merkezi
- support reply ve support status notification akisi
- read / archive kontrolu
- verification: `test:system-notifications`, prisma generate, lint, tsc, build

### `feature/admin-access-gateway`
- env tabanli admin access policy helper
- `/admin`, `/admin/login`, `/api/admin/*` policy enforcement
- Zero Trust uyumlu header/email allowlist modeli
- `AUTH_TRUST_HOST` ile localhost production-benzeri test destegi
- verification: `test:admin-access-gateway`, lint, tsc, build

## Tamamlanan Docs-Only Branch'ler
- `docs/cleanup-roadmap-and-encoding`
  - stale roadmap / planning copleri temizlendi
  - aktif docs seti sadelestirildi

## Aktif Branch
### `feature/branding-assets-upload`
- branding upload route'u ekleniyor
- logo / favicon / og image icin upload aksiyonlari
- system settings branding alanina media picker mantigi baglaniyor
- logoUrl branding namespace'ine ekleniyor
- brandIconUrl branding namespace'ine ekleniyor
- yuklenen logo public ana sayfa ve auth yuzeylerinde kullaniliyor
- dashboard'da compact icon zorunlulugu geri cekiliyor; dar yuzeyler guvenli fallback glyph ile calisiyor
- branding save sonrasi client-side favicon ve theme-color sync ekleniyor
- branding asset alanlarina varsayilana don aksiyonu ekleniyor
- in-game dashboard mobile nav gercekten render edilip responsive akisa aliniyor
- save sonrasi kullanilmayan eski branding asset dosyalari temizleniyor
- ana sayfa hero logosu `priority` ile yukleniyor
- desktop dashboard header'da wordmark icin yatay container kullaniliyor
- Turnstile cleanup logout/navigation sirasinda DOM hatasi uretmeyecek sekilde sadeleştiriliyor
- guvenlik:
  - PNG / JPEG / WebP
  - signature kontrolu
  - tum branding asset'leri icin 4 MB boyut limiti
  - admin auth + rate limit
- logo kare olmak zorunda degil; yatay wordmark guvenli container'larla destekleniyor
- verification hedefi:
  - `test:branding-seo-settings`
  - `test:system-settings-hardening`
  - `test:branding-assets-upload`
  - lint, tsc, build

## Aktif Sonraki Branch Adaylari
1. `feature/cache-and-rate-limit-foundation`
2. `feature/integration-hub`
3. `feature/dashboard-visual-polish`
4. `feature/store-merchandising`
5. `feature/admin-shop-ux`

## Temizlenen Eski Icerik
Bu dosyadan sunlar kaldirildi:
- artik karar aldirma degeri olmayan ilk migration checklist'leri
- bozuk encoding'li eski durum notlari
- tarihsel ama operasyonel olmayan uzun tekrarlar



