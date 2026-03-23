# Kalan Isler

> Son guncelleme: 23 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/branding-assets-upload`
2. `feature/cache-and-rate-limit-foundation`
3. `feature/integration-hub`
4. `feature/dashboard-visual-polish`
5. `feature/store-merchandising`
6. `feature/admin-shop-ux`
7. `feature/admin-promotions-ux`
8. `feature/cosmetic-render-upgrade`
9. `feature/admin-cosmetic-authoring`
10. `feature/gameplay-ui-polish`
11. `feature/analytics-event-foundation`
12. `feature/word-analytics-liveops`
13. `feature/release-ops-docs`
14. `docs/encoding-cleanup`
15. `feature/wallet-ledger-foundation`

## En Kritik Acik Isler

### 1. Branding / SEO Runtime
- public branding ayarlari
- metadata / open graph / favicon runtime kontrolu
- site identity paneli
- canonical, robots ve sitemap metadata route'lari
- system settings icinde responsive section-based kullanim

### 2. System Settings Hardening
- admin system settings write rate limit
- dis URL branding preview guvenligi
- upload gelene kadar sadece guvenli preview davranisi

### 3. Branding Assets Upload
- logo / favicon / og image upload
- guvenli dosya dogrulama
- medya secici ile branding paneline baglama
- root-relative branding asset path standardi
- dashboard branding gorunumu
- favicon live update ve reset-to-default davranisi

### 4. Cache / Rate Limit Foundation
- Redis/Valkey abstraction
- development memory fallback
- production shared cache and rate limit store
- room/lobi multi-instance mimarisine hazirlik

### 5. Integration Hub
- dis servis baglantilarini tek panelde toplama
- provider readiness / secret guidance / status bloklari
- sonraki ops entegrasyonlarina hazir omurga

## Son Tamamlanan Dilim
### `fix/system-settings-hardening`
- admin `system-settings` write route'una ayri rate limit
- branding preview'da dis URL'leri otomatik yuklememe
- sadece root-relative guvenli asset preview davranisi
- upload slice oncesi guvenlik sertlestirmesi

## Aktif Dilim
### `feature/branding-assets-upload`
- branding upload route'u
- logo / favicon / og asset upload
- admin system settings icinde upload aksiyonlari
- varsayilana don butonlari
- branding save sonrasi logo/favicon/theme-color senkronu
- dashboard full-page ve in-game dashboard branding gorunumu
- in-game dashboard mobile nav ve responsive overlay duzenlemesi
- ilk asset guvenlik kurallari:
  - PNG / JPEG / WebP
  - mime + signature kontrolu
  - asset tipine gore boyut limiti

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
