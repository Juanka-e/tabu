# Gorev Kaydi

> Son guncelleme: 30 March 2026
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
- `feature/dashboard-visual-polish`
- `feature/store-merchandising`

## Son Tamamlanan Branch
### `feature/store-merchandising`
- oyuncu-facing magazanin merchandising dili guclendirildi
- preview modal akisi netlestirildi
- kupon girdiginde kart bazli indirim gorunurlugu iyilestirildi
- inventory preview ve hizli kusan akislarina tutarlilik geldi
- dashboard sidebar icindeki kesif / discovery alani rafine edildi
- son follow-up ile:
  - kupon state / purchase request uyumu
  - sidebar load azaltimi
  - notification read idempotency
  - UTF-8 magazaya kopya duzeltmesi

## Aktif Branch
### `feature/admin-shop-ux`
- admin shop item ve promotion operasyonlarini okunur hale getirme
- featured / active / hidden / scheduled merchandising kontrol dili
- item, bundle ve promotion iliskilerini admin gozunde daha net gosterme
- arama, filtre ve toplu islem akislarini toparlama
- referans:
  - `docs/guides/admin-shop-ux-planning-guide.md`

## Aktif Sonraki Branch Adaylari
1. `feature/admin-shop-ux`
2. `feature/admin-inventory-operations`
3. `feature/night-market-foundation`
4. `feature/economy-abuse-hardening`
5. `feature/cache-and-rate-limit-foundation`
6. `feature/admin-promotions-ux`
7. `feature/cosmetic-render-upgrade`
8. `feature/admin-cosmetic-authoring`
9. `feature/gameplay-ui-polish`
10. `feature/analytics-event-foundation`
11. `feature/word-analytics-liveops`
12. `feature/release-ops-docs`
13. `docs/encoding-cleanup`
14. `feature/wallet-ledger-foundation`

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
