# Kalan Isler

> Son guncelleme: 16 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/system-notifications-foundation`
2. `feature/admin-access-gateway`
3. `feature/branding-seo-settings`
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

### 1. Notifications
- in-app inbox
- unread state
- support reply ve system message bildirimi
- dusuk frekansli polling; realtime yok
- support'tan ayrik bell/inbox girisi

### 2. Admin Access Gateway
- prod admin erisim modelini netlestirme
- `/admin/login` gorunurluk ve allowlist politikalari
- ayrik admin access/gateway stratejisi
- Zero Trust uyumlu header/email policy katmani

## Son Tamamlanan Dilim
### `feature/support-desk-foundation`
- support girisi full-page dashboard ve overlay icinde help ikonu uzerinden acildi
- kullanici ticket ve reply akisi eklendi
- admin support kuyrugu, public reply ve internal note eklendi
- reply cooldown, stale UI giderimi ve workflow guard'lari tamamlandi

## Aktif Dilim
### `feature/system-notifications-foundation`
- `notifications` veri modeli
- unread count + mark as read + read all
- tekil temizleme + toplu temizleme
- support reply / support status notification entegrasyonu
- dashboard bell/inbox merkezi

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
