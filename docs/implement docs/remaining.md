# Kalan Isler

> Son guncelleme: 23 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `fix/system-settings-hardening`
2. `feature/branding-assets-upload`
3. `feature/cache-and-rate-limit-foundation`
4. `feature/integration-hub`
5. `feature/dashboard-visual-polish`
6. `feature/store-merchandising`
7. `feature/admin-shop-ux`
8. `feature/admin-promotions-ux`
9. `feature/cosmetic-render-upgrade`
10. `feature/admin-cosmetic-authoring`
11. `feature/gameplay-ui-polish`
12. `feature/analytics-event-foundation`
13. `feature/word-analytics-liveops`
14. `feature/release-ops-docs`
15. `docs/encoding-cleanup`
16. `feature/wallet-ledger-foundation`

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
### `feature/admin-access-gateway`
- env tabanli admin access policy
- `/admin`, `/admin/login`, `/api/admin/*` policy entegrasyonu
- local-dev bypass + production fail-closed
- Zero Trust uyumlu header/email allowlist modeli
- localhost production-benzeri test icin `AUTH_TRUST_HOST` destegi

## Aktif Dilim
### `fix/system-settings-hardening`
- admin `system-settings` write route'una ayri rate limit
- branding preview'da dis URL'leri otomatik yuklememe
- sadece root-relative guvenli asset preview davranisi
- upload slice oncesi guvenlik sertlestirmesi

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
