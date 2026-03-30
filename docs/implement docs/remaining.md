# Kalan Isler

> Son guncelleme: 30 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/admin-shop-ux`
2. `feature/admin-inventory-operations`
3. `feature/night-market-foundation`
4. `feature/economy-abuse-hardening`
5. `feature/cache-and-rate-limit-foundation`
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

### 1. Admin Shop UX
- item ile store offer ayrimi
- admin katalog karmasasini azaltan arama / filtre / toplu aksiyonlar
- active / hidden / scheduled / seasonal / event-only durumlari
- future night market ve liveops kullanimina uygun operasyon yuzeyi
- featured / merchandising kontrol dilinin guclendirilmesi
- promotion ve bundle baglarinin daha gorunur olmasi
- branch rehberi:
  - `docs/guides/admin-shop-ux-planning-guide.md`

### 2. Admin Inventory Operations
- oyuncu inventory goruntuleme
- item grant / revoke
- equip reset ve operasyonel duzeltmeler
- grant nedeni ve audit izi

### 3. Economy / Abuse Hardening
- guest coin yok kurali ustune hesapli kullanicilar icin reward eligibility
- gunluk ve saatlik coin cap
- ayni oyuncu gruplarinda kademeli coin verim dusurme
- IP/subnet'i tek basina ceza nedeni degil, yumusak suphe sinyali olarak kullanma
- planning referansi:
  - `docs/guides/economy-abuse-strategy-guide.md`

### 4. Cache / Rate Limit Foundation
- Redis/Valkey abstraction
- development memory fallback
- production shared cache and rate limit store
- room/lobi multi-instance mimarisine hazirlik
- PM2 multi-instance ve websocket koordinasyon notlari:
  - `docs/cache-and-storage-strategy.md`

## Son Tamamlanan Dilim
### `feature/store-merchandising`
- magazanin oyuncu-facing merchandising dili rafine edildi
- urun, bundle ve preview akislari toparlandi
- kupon ve fiyat gorunurlugu anlasilir hale getirildi
- inventory preview ve dashboard sidebar follow-up'lari kapatildi
- store dashboard follow-up branch'i ile:
  - sidebar yukunun azaltilmasi
  - idempotent notification read
  - UTF-8 magazaya kopya duzeltmesi

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
