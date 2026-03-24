# Kalan Isler

> Son guncelleme: 24 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/integration-hub`
2. `feature/dashboard-visual-polish`
3. `feature/cache-and-rate-limit-foundation`
4. `feature/store-merchandising`
5. `feature/admin-shop-ux`
6. `feature/admin-promotions-ux`
7. `feature/cosmetic-render-upgrade`
8. `feature/admin-cosmetic-authoring`
9. `feature/gameplay-ui-polish`
10. `feature/analytics-event-foundation`
11. `feature/word-analytics-liveops`
12. `feature/release-ops-docs`
13. `docs/encoding-cleanup`
14. `feature/wallet-ledger-foundation`

## En Kritik Acik Isler

### 1. Integration Hub
- dis servis baglantilarini tek panelde toplama
- provider readiness / secret guidance / status bloklari
- runtime/env wiring gorunurlugu
- sonraki ops entegrasyonlarina hazir omurga

### 2. Dashboard Visual Polish
- full-page dashboard ve in-game overlay tutarliligi
- spacing / density / hierarchy duzeltmeleri
- mobile responsive pürüz temizligi
- state yuzeyleri: loading / empty / error / success

### 3. Cache / Rate Limit Foundation
- Redis/Valkey abstraction
- development memory fallback
- production shared cache and rate limit store
- room/lobi multi-instance mimarisine hazirlik
- PM2 multi-instance ve websocket koordinasyon notlari:
  - `docs/cache-and-storage-strategy.md`

## Son Tamamlanan Dilim
### `feature/branding-assets-upload` + follow-up
- branding upload route'u
- logo / favicon / og asset upload
- branding save sonrasi live favicon/theme-color sync
- stale branding asset cleanup
- compact branding asset yolunun kaldirilmasi
- guides klasoru altinda branding/card rehberlerinin toplanmasi
- kalici `test:turnstile-smoke` komutu

## Aktif Dilim
### `feature/integration-hub`
- `/admin/integrations`
- runtime / security / access / messaging / storage entegrasyon kartlari
- provider readiness ve env wiring ozetleri
- olmayan provider'lari `planned` olarak acik gosteren ilk hub modeli
- `test:integration-hub`

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
