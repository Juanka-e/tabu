# Gorev Kaydi

> Son guncelleme: 31 March 2026
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
- `feature/admin-shop-ux`
- `feature/admin-inventory-operations`

## Son Tamamlanan Fix Branch
### `fix/coin-grants-archive-lifecycle`
- coin grant campaign ve code tarafinda lifecycle ayni modele cekildi
- `Tüm operasyonel`, `Aktif`, `Pasif`, `Arşiv` filtre semantigi netlesti
- `Pasife al`, `Arşive kaldır`, `Arşivden çıkar` davranislari ayrildi
- campaign/code kart yogunlugu azaltildi
- campaign bazli kod ozeti ve arama daraltmasi guclendirildi
- referans:
  - `docs/guides/coin-grants-archive-lifecycle-guide.md`

## Bir Onceki Fix Branch
### `fix/admin-content-ops`
- duyuru kartlari compact ve oyuncu-odakli hale getirildi
- duplicate metin ve block count gibi ic metadata kaldirildi
- admin preview oyuncu renderina yaklastirildi
- kelime bulk upload iki modlu hale geldi:
  - `csv_categories`
  - `fixed_categories`
- duplicate / skipped / error sonucu gorunur oldu
- kelimelerde sayfa-bazli secim ve guvenli bulk delete eklendi
- eski `Toplu Yukleme` girisi kaldirildi, dogrudan URL `Kelime Yonetimi`ne yonlenir
- referans:
  - `docs/guides/admin-content-ops-guide.md`

## Son Tamamlanan Fix Branch
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
### `feature/economy-abuse-hardening`
- reward eligibility kurallarini merkezi hale getirme
- coin cap ve diminishing returns temelini kurma
- repeated-group ve benzeri sinyalleri yumusak suphe skoruna baglama
- audit ve admin review icin aciklanabilir ekonomi sinyalleri uretme
- referans:
  - `docs/guides/economy-abuse-hardening-guide.md`
  - `docs/guides/economy-abuse-strategy-guide.md`

## Planning Notlari
- Store / liveops / economy stratejisi icin ana referanslar:
  - `docs/guides/store-liveops-strategy-guide.md`
  - `docs/guides/economy-abuse-strategy-guide.md`
- Night market ve gorev sistemi yapisi icin:
  - `docs/guides/night-market-and-missions-strategy-guide.md`

## Aktif Sonraki Branch Adaylari
1. `feature/economy-abuse-hardening`
2. `feature/cache-and-rate-limit-foundation`
3. `feature/night-market-foundation`
4. `feature/admin-promotions-ux`
5. `feature/cosmetic-render-upgrade`
6. `feature/admin-cosmetic-authoring`
7. `feature/gameplay-ui-polish`
8. `feature/analytics-event-foundation`
9. `feature/word-analytics-liveops`
10. `feature/release-ops-docs`
11. `docs/encoding-cleanup`
12. `feature/wallet-ledger-foundation`

## Temizlenen Eski Icerik
Bu dosyadan sunlar kaldirildi:
- artik karar aldirma degeri olmayan ilk migration checklist'leri
- bozuk encoding'li eski durum notlari
- tarihsel ama operasyonel olmayan uzun tekrarlar
