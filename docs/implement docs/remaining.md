# Kalan Isler

> Son guncelleme: 30 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/admin-inventory-operations`
2. `feature/night-market-foundation`
3. `feature/economy-abuse-hardening`
4. `feature/cache-and-rate-limit-foundation`
5. `feature/admin-promotions-ux`
6. `feature/cosmetic-render-upgrade`
7. `feature/admin-cosmetic-authoring`
8. `feature/gameplay-ui-polish`
9. `feature/analytics-event-foundation`
10. `feature/word-analytics-liveops`
11. `feature/release-ops-docs`
12. `docs/encoding-cleanup`
13. `feature/wallet-ledger-foundation`

## En Kritik Acik Isler

### 1. Admin Inventory Operations
- oyuncu inventory goruntuleme
- item grant / revoke
- equip reset ve operasyonel duzeltmeler
- grant nedeni ve audit izi
- branch rehberi:
  - `docs/guides/admin-inventory-operations-planning-guide.md`

### 2. Economy / Abuse Hardening
- guest coin yok kurali ustune hesapli kullanicilar icin reward eligibility
- gunluk ve saatlik coin cap
- ayni oyuncu gruplarinda kademeli coin verim dusurme
- IP/subnet'i tek basina ceza nedeni degil, yumusak suphe sinyali olarak kullanma
- planning referansi:
  - `docs/guides/economy-abuse-strategy-guide.md`

### 3. Cache / Rate Limit Foundation
- Redis/Valkey abstraction
- development memory fallback
- production shared cache and rate limit store
- room/lobi multi-instance mimarisine hazirlik
- PM2 multi-instance ve websocket koordinasyon notlari:
  - `docs/cache-and-storage-strategy.md`

## Son Tamamlanan Dilim
### `feature/admin-shop-ux`
- admin shop item ve promotion operasyonlari toparlandi
- relation visibility ve promotions deep-link akisi eklendi
- yayin modeli (`availabilityMode`, `startsAt`, `endsAt`) eklendi
- `event_only`, `seasonal`, `limited`, `scheduled` akislari icin zemin hazirlandi
- promotion lifecycle mantigi:
  - pasife al
  - guvenliyse sil
  olarak netlestirildi

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
