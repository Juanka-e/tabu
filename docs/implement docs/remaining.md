# Kalan Isler

> Son guncelleme: 25 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/dashboard-visual-polish`
2. `feature/store-merchandising`
3. `feature/admin-shop-ux`
4. `feature/admin-inventory-operations`
5. `feature/night-market-foundation`
6. `feature/economy-abuse-hardening`
7. `feature/cache-and-rate-limit-foundation`
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

### 1. Dashboard Visual Polish
- full-page dashboard ve in-game overlay tutarliligi
- spacing / density / hierarchy duzeltmeleri
- mobile responsive puruz temizligi
- state yuzeyleri: loading / empty / error / success

### 2. Store Merchandising
- oyuncu-facing magazayi daha anlasilir hale getirme
- urun preview, sahiplik ve equip durumunun netlestirilmesi
- featured / seasonal / limited / discount vitrin dili
- satin almadan once item etkisini gosteren preview akislarinin tasarimi
- referans:
  - `docs/guides/store-liveops-strategy-guide.md`

### 3. Admin Shop UX
- item ile store offer ayrimi
- admin katalog karmasasini azaltan arama / filtre / toplu aksiyonlar
- active / hidden / scheduled / seasonal / event-only durumlari
- future night market ve liveops kullanimina uygun operasyon yuzeyi

### 4. Economy / Abuse Hardening
- guest coin yok kurali ustune hesapli kullanicilar icin reward eligibility
- gunluk ve saatlik coin cap
- ayni oyuncu gruplarinda kademeli coin verim dusurme
- IP/subnet'i tek basina ceza nedeni degil, yumusak suphe sinyali olarak kullanma
- planning referansi:
  - `docs/guides/economy-abuse-strategy-guide.md`

### 5. Cache / Rate Limit Foundation
- Redis/Valkey abstraction
- development memory fallback
- production shared cache and rate limit store
- room/lobi multi-instance mimarisine hazirlik
- PM2 multi-instance ve websocket koordinasyon notlari:
  - `docs/cache-and-storage-strategy.md`

## Son Tamamlanan Dilim
### `feature/integration-hub`
- `/admin/integrations`
- runtime / security / access / messaging / storage entegrasyon kartlari
- provider readiness ve env wiring ozetleri
- olmayan provider'lari `planned` olarak acik gosteren ilk hub modeli
- `test:integration-hub`
- MySQL gecici yoksa settings fallback
- production health endpoint guard
- deployment security guide

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
