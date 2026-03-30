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
- `feature/admin-inventory-operations`

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

## Son Tamamlanan Branch
### `feature/admin-inventory-operations`
- oyuncu inventory inspect ekrani eklendi
- item grant / revoke / equip reset akisleri geldi
- protected source revoke modeli eklendi
- riskli inventory aksiyonlari icin onay modal'lari eklendi
- inventory read route dahil admin inventory API yuzeyi rate limit ile korundu
- secili oyuncu icin son operasyon notlari gorunur hale geldi
- audit ekraninda not kolonu acildi
- referans:
  - `docs/guides/admin-inventory-operations-planning-guide.md`

## Aktif Branch
### `fix/admin-security-hardening`
- admin panel API guvenlik taramasi
- authz / request korumasi / rate limit kapsami
- trusted proxy / IP gorunurlugu notlari
- referans:
  - `docs/guides/admin-security-hardening-guide.md`

## Aktif Sonraki Branch Adaylari
1. `fix/admin-security-hardening`
2. `fix/admin-content-ops`
3. `fix/coin-grants-archive-lifecycle`
4. `feature/admin-user-observability`
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
