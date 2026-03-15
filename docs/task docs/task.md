# Gorev Kaydi

> Son guncelleme: 14 March 2026
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

## Tamamlanan Docs-Only Branch'ler
- `docs/cleanup-roadmap-and-encoding`
  - stale roadmap / planning copleri temizlendi
  - aktif docs seti sadelestirildi

## Aktif Fix Branch'ler
- `fix/security-review-remediation`
  - `callbackUrl` redirect sink kapatildi
  - announcement sistemi structured content modeline tasindi
  - oyuncu tarafinda announcement `dangerouslySetInnerHTML` kaldirildi
  - store/admin/public agir GET endpoint'lere read rate limit eklendi
  - AI raporundaki Prisma field false positive'i smoke test ile dogrulandi
- `fix/captcha-provider-policy`
  - tek aktif provider politikasi netlestiriliyor
  - production strict enforcement zorunlu hale getiriliyor
  - Turnstile mode runtime ayari ekleniyor
  - admin captcha ayarlari sadeleştiriliyor

## Aktif Branch
### `fix/captcha-provider-policy`
- default captcha provider `turnstile` olarak normalize edildi
- production strict enforcement captcha verification tarafinda zorunlu hale getirildi
- admin panelden `failMode` secimi kaldiriliyor; provider + flow + Turnstile mode uzerinden sade yapi kuruluyor
- verification: `test:captcha-security`, lint, tsc, build

## Aktif Sonraki Branch Adaylari
1. `feature/system-notifications-foundation`
2. `feature/admin-access-gateway`
3. `feature/branding-seo-settings`
4. `feature/integration-hub`
5. `feature/progression-foundation`
6. `feature/wallet-ledger-foundation`

## Temizlenen Eski Icerik
Bu dosyadan sunlar kaldirildi:
- artik karar aldirma degeri olmayan ilk migration checklist'leri
- bozuk encoding'li eski durum notlari
- tarihsel ama operasyonel olmayan uzun tekrarlar


