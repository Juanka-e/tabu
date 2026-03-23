# Kalan Isler

> Son guncelleme: 23 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/branding-seo-settings`
2. `fix/system-settings-hardening`
3. `feature/branding-assets-upload`
4. `feature/cache-and-rate-limit-foundation`
5. `feature/integration-hub`
6. `feature/dashboard-visual-polish`
7. `feature/store-merchandising`
8. `feature/admin-shop-ux`
9. `feature/admin-promotions-ux`
10. `feature/cosmetic-render-upgrade`
11. `feature/admin-cosmetic-authoring`
12. `feature/gameplay-ui-polish`
13. `feature/analytics-event-foundation`
14. `feature/word-analytics-liveops`
15. `feature/release-ops-docs`
16. `docs/encoding-cleanup`
17. `feature/wallet-ledger-foundation`

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
### `feature/branding-seo-settings`
- `branding` system settings namespace'i
- runtime metadata / Open Graph / favicon / theme color
- canonical, `robots.ts` ve `sitemap.ts`
- auth/store icin page-specific metadata
- admin panelde branding ve SEO alanlari + OG preview
- sonraki tamamlayici not:
  - `docs/cache-and-storage-strategy.md`

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
