# Gorev Kaydi

> Son guncelleme: 25 March 2026
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
- `feature/integration-hub`

## Son Tamamlanan Branch
### `feature/integration-hub`
- `/admin/integrations`
- runtime / security / access / messaging / storage provider kartlari
- env wiring ve readiness ozeti
- captcha, admin access, auth core, database, branding storage, email outbound ve Redis/Valkey durum bloklari
- `test:integration-hub`
- MySQL gecici erisilemezse `system settings` default fallback
- production deployment guvenligi:
  - loopback bind varsayilani
  - token-korumali `/api/health`
  - `docs/guides/deployment-security-guide.md`

## Aktif Docs-Only Branch
### `docs/store-economy-strategy`
- `docs/guides/store-liveops-strategy-guide.md`
- `docs/guides/economy-abuse-strategy-guide.md`
- store / liveops / inventory / personalized offer ayrimi
- night market ve item pool filtreleme kararlari
- coin source / sink ve anti-abuse katmanlari

## Aktif Sonraki Branch Adaylari
1. `feature/dashboard-visual-polish`
2. `feature/store-merchandising`
3. `feature/admin-shop-ux`
4. `feature/admin-inventory-operations`
5. `feature/night-market-foundation`
6. `feature/economy-abuse-hardening`
7. `feature/cache-and-rate-limit-foundation`
8. `feature/admin-promotions-ux`
9. `feature/cosmetic-render-upgrade`
10. `feature/admin-cosmetic-authoring`
11. `feature/gameplay-ui-polish`
12. `feature/analytics-event-foundation`
13. `feature/word-analytics-liveops`
14. `feature/release-ops-docs`
15. `docs/encoding-cleanup`
16. `feature/wallet-ledger-foundation`

## Mimari Notlar
- Cache / Redis / Valkey / PM2 stratejisi icin ana referans:
  - `docs/cache-and-storage-strategy.md`
- Store / liveops / economy stratejisi icin ana referanslar:
  - `docs/guides/store-liveops-strategy-guide.md`
  - `docs/guides/economy-abuse-strategy-guide.md`

## Temizlenen Eski Icerik
Bu dosyadan sunlar kaldirildi:
- artik karar aldirma degeri olmayan ilk migration checklist'leri
- bozuk encoding'li eski durum notlari
- tarihsel ama operasyonel olmayan uzun tekrarlar
