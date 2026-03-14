# Kalan Isler

> Son guncelleme: 14 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/admin-user-operations`
2. `feature/admin-audit-viewer`
3. `feature/coin-grant-campaigns`
4. `feature/support-desk-foundation`
5. `feature/system-notifications-foundation`
6. `feature/admin-access-gateway`
7. `feature/branding-seo-settings`
8. `feature/integration-hub`
9. `feature/dashboard-visual-polish`
10. `feature/store-merchandising`
11. `feature/admin-shop-ux`
12. `feature/admin-promotions-ux`
13. `feature/cosmetic-render-upgrade`
14. `feature/admin-cosmetic-authoring`
15. `feature/gameplay-ui-polish`
16. `feature/analytics-event-foundation`
17. `feature/word-analytics-liveops`
18. `feature/release-ops-docs`
19. `docs/encoding-cleanup`

## En Kritik Acik Isler

### 1. Admin User Operations
- coin ekle / sil
- reason zorunlulugu
- audit baglantisi
- negatif bakiye korumasi
- gerekirse kick / operational controls

### 2. Audit Viewer
- hangi admin hangi islemi yapti sorusuna tek ekrandan cevap
- filtre, arama, tarih araligi, resource tipi

### 3. Coin Grant Campaigns
- influencer ve etkinlik odakli coin dagitimi
- claim limiti, budget, expiry, duplicate claim korumasi

### 4. Support Desk
- ticket, ticket message, assignee, internal note, status transitions

### 5. Notifications
- in-app inbox
- unread state
- support reply ve system message bildirimi

## Son Tamamlanan Dilim
### `feature/user-email-foundation`
- yeni kayitlarda email zorunlu
- legacy emailsiz hesap uyumu korundu
- user settings ve admin users ekraninda email goruntuleniyor
- `normalizedEmail` unique altyapisi eklendi

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
