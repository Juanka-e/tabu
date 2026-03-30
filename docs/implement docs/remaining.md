# Kalan Isler

> Son guncelleme: 30 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `fix/admin-security-hardening`
2. `fix/admin-content-ops`
3. `fix/coin-grants-archive-lifecycle`
4. `feature/admin-user-observability`
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

### 1. Admin Security Hardening
- admin panel API authz taramasi
- write route request korumalari
- admin read/write rate limit kapsami
- trusted proxy / IP gorunurlugu karar cizgisi
- branch rehberi:
  - `docs/guides/admin-security-hardening-guide.md`

### 2. Admin Content Ops
- duyuru duplicate render bug
- oyuncuya block count gibi ic metadata gostermeme
- duyuru editor / render modelini daha compact hale getirme
- toplu kelime yukleme icin kategori / alt kategori akisi
- branch rehberi:
  - `docs/guides/admin-security-hardening-guide.md`

### 3. Coin Grants Archive Lifecycle
- archive davranisinin campaign ve code tarafinda tutarli hale getirilmesi
- `Tum` ve `Arsiv` filtrelerinde ayni kural seti

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
