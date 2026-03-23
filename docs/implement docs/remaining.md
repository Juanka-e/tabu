# Kalan Isler

> Son guncelleme: 16 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/admin-access-gateway`
2. `feature/branding-seo-settings`
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

### 1. Admin Access Gateway
- prod admin erisim modelini netlestirme
- `/admin/login` gorunurluk ve allowlist politikalari
- ayrik admin access/gateway stratejisi
- Zero Trust uyumlu header/email policy katmani

### 2. Branding / SEO Runtime
- public branding ayarlari
- metadata / open graph / favicon runtime kontrolu
- site identity paneli

## Son Tamamlanan Dilim
### `feature/system-notifications-foundation`
- `notifications` veri modeli eklendi
- unread count + mark as read + read all
- tekil temizleme + toplu temizleme
- support reply / support status notification entegrasyonu
- dashboard bell/inbox merkezi

## Aktif Dilim
### `feature/admin-access-gateway`
- env tabanli access policy
- `/admin`, `/admin/login`, `/api/admin/*` policy entegrasyonu
- local-dev bypass + production fail-closed
- Zero Trust uyumlu header/email allowlist modeli

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
