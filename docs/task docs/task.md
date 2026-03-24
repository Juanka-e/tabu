# Gorev Kaydi

> Son guncelleme: 24 March 2026
> Durum: aktif execution log

## Cekirdek Kurallar
- Her branch tek konu tasir.
- Implementasyon sonunda `review`, `test`, `refactor`, `docs`, `push` kapanisi zorunludur.
- PR olmadan once branch kapsam disina cikilmaz.

## Guncel Tamamlanan Feature Branch'ler
- `feature/liveops-system-settings-foundation`
- `feature/security-entry-gates`
- `feature/admin-table-foundation`
- `feature/moderation-foundation`
- `feature/economy-liveops-controls`
- `feature/user-email-foundation`
- `feature/admin-user-operations`
- `feature/admin-audit-viewer`
- `feature/coin-grant-campaigns`
- `feature/support-desk-foundation`
- `feature/system-notifications-foundation`
- `feature/admin-access-gateway`
- `feature/branding-seo-settings`
- `feature/branding-assets-upload`
- `fix/branding-assets-followup`

## Son Tamamlanan Branch
### `feature/branding-assets-upload` + `fix/branding-assets-followup`
- branding upload route'u
- logo / favicon / og image upload
- admin system settings branding media akislari
- live favicon/theme-color sync
- stale branding asset cleanup
- dashboard branding sadeleştirmesi
- logout/Turnstile cleanup duzeltmeleri
- `docs/guides/` klasoru
- kalici `test:turnstile-smoke`

## Aktif Branch
### `feature/integration-hub`
- `/admin/integrations`
- runtime / security / access / messaging / storage provider kartlari
- env wiring ve readiness ozeti
- captcha, admin access, auth core, database, branding storage, email outbound ve Redis/Valkey durum bloklari
- `test:integration-hub`

## Aktif Sonraki Branch Adaylari
1. `feature/dashboard-visual-polish`
2. `feature/cache-and-rate-limit-foundation`
3. `feature/store-merchandising`
4. `feature/admin-shop-ux`
5. `feature/admin-promotions-ux`

## Mimari Not
- Cache / Redis / Valkey / PM2 stratejisi icin ana referans:
  - `docs/cache-and-storage-strategy.md`

## Temizlenen Eski Icerik
Bu dosyadan sunlar kaldirildi:
- artik karar aldirma degeri olmayan ilk migration checklist'leri
- bozuk encoding'li eski durum notlari
- tarihsel ama operasyonel olmayan uzun tekrarlar
