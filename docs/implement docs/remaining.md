# Kalan Isler

> Son guncelleme: 30 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `fix/admin-content-ops`
2. `fix/coin-grants-archive-lifecycle`
3. `feature/admin-user-observability`
4. `feature/night-market-foundation`
5. `feature/economy-abuse-hardening`
6. `feature/cache-and-rate-limit-foundation`
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

### 1. Admin Content Ops
- duyuru duplicate render bug kapatildi
- oyuncuya block count gibi ic metadata gostermeme kapatildi
- duyuru editor / render modelinin compactlastirilmasi kapatildi
- toplu kelime yukleme icin kategori / alt kategori akisi eklendi
- kelimelerde sayfa-bazli toplu secim ve guvenli bulk delete eklendi
- branch rehberi:
  - `docs/guides/admin-content-ops-guide.md`

Kalan follow-up ihtiyaclari:
- duyurularda gerekirse read/unread veya pinned ayrimi
- kelimelerde bulk delete icin ekstra permission ayrimi gerekiyorsa sonraki security/policy slice'inda ele alinmasi

### 2. Coin Grants Archive Lifecycle
- archive davranisinin campaign ve code tarafinda tutarli hale getirilmesi
- `Tum` ve `Arsiv` filtrelerinde ayni kural seti

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
### `feature/admin-inventory-operations`
- admin inventory inspect sayfasi eklendi
- grant / revoke / equip reset route'lari geldi
- protected source revoke ve onay modallari eklendi
- inventory route'larina rate limit eklendi
- inventory ekraninda son operasyon notlari gorunur oldu
- audit ekraninda not kolonu acildi

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
