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
### `fix/admin-security-hardening`
- admin API read/write route'larina tutarli rate limit kapsami yayildi
- `TRUST_PROXY` artik request rate limit ve audit IP kaydinda gercekten uygulanir hale geldi
- admin guvenlik kapsam rehberi ve deployment guide guncellendi
- oyuncu tarafinda:
  - `user/me`
  - `user/dashboard`
  - `user/inventory`
  - `support/tickets`
  - `store/items`
  read route'larina rate limit eklendi
- referans:
  - `docs/guides/admin-security-hardening-guide.md`

## Aktif Branch
### `fix/admin-content-ops`
- duyuru kartlarini compact, oyuncu-odakli hale getirme
- oyuncuya block count gibi ic metadata gostermeme
- admin preview ile player renderi hizalama
- toplu kelime yukleme icin kategori / alt kategori secimi
- kelimelerde sayfa-bazli secim ve guvenli bulk delete
- referans:
  - `docs/guides/admin-content-ops-guide.md`

## Bu Branch'te Tamamlanan Son Dilimler
### `fix/admin-content-ops`
- duyuru collapsed kart dili tekrar hissi vermeyecek sekilde sadeleştirildi
- `YENI` etiketi 7 gunluk gorunum mantigiyla korundu
- tarih meta alani sag uste tasindi
- admin preview oyuncu kartina yaklastirildi
- bulk upload iki modlu hale getirildi:
  - `csv_categories`
  - `fixed_categories`
- duplicate / skipped / error sonucu modalda raporlanir oldu
- kelimelerde toplu secim ve bulk delete geldi
- bulk delete:
  - ikinci onay
  - sayili CTA
  - `10+` kayitta reason
  - audit kaydi
  ile sertlestirildi
- referans:
  - `docs/guides/admin-content-ops-guide.md`

## Aktif Sonraki Branch Adaylari
1. `fix/admin-content-ops`
2. `fix/coin-grants-archive-lifecycle`
3. `feature/admin-user-observability`
4. `feature/night-market-foundation`
5. `feature/economy-abuse-hardening`
6. `feature/cache-and-rate-limit-foundation`
7. `feature/admin-promotions-ux`
8. `feature/cosmetic-render-upgrade`
9. `feature/admin-cosmetic-authoring`
10. `feature/gameplay-ui-polish`
11. `feature/analytics-event-foundation`
12. `feature/word-analytics-liveops`
13. `feature/release-ops-docs`
14. `docs/encoding-cleanup`
15. `feature/wallet-ledger-foundation`

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
