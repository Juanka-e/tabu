# Kalan Isler

> Son guncelleme: 16 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/branding-seo-settings`
2. `feature/integration-hub`
3. `feature/dashboard-visual-polish`
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

### 1. Branding / SEO Runtime
- public branding ayarlari
- metadata / open graph / favicon runtime kontrolu
- site identity paneli

### 2. Integration Hub
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

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
