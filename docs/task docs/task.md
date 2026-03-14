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

## Aktif Sonraki Branch Adaylari
1. `feature/admin-user-operations`
2. `feature/admin-audit-viewer`
3. `feature/coin-grant-campaigns`
4. `feature/support-desk-foundation`
5. `feature/system-notifications-foundation`

## Temizlenen Eski Icerik
Bu dosyadan sunlar kaldirildi:
- artik karar aldirma degeri olmayan ilk migration checklist'leri
- bozuk encoding'li eski durum notlari
- tarihsel ama operasyonel olmayan uzun tekrarlar
