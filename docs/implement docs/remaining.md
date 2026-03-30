# Kalan Isler

> Son guncelleme: 30 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `fix/coin-grants-archive-lifecycle`
2. `feature/admin-user-observability`
3. `feature/economy-abuse-hardening`
4. `feature/night-market-foundation`
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

### 1. Coin Grants Archive Lifecycle
- archive davranisinin campaign ve code tarafinda tutarli hale getirilmesi
- `Tum`, `Aktif`, `Pasif`, `Arsiv` filtrelerinde ayni semantik kuralin kullanilmasi
- archive, pasiflestirme ve silme davranislarinin netlestirilmesi
- branch rehberi:
  - `docs/guides/coin-grants-archive-lifecycle-guide.md`

### 2. Economy / Abuse Hardening
- guest coin yok kurali ustune hesapli kullanicilar icin reward eligibility
- gunluk ve saatlik coin cap
- ayni oyuncu gruplarinda kademeli coin verim dusurme
- IP/subnet'i tek basina ceza nedeni degil, yumusak suphe sinyali olarak kullanma
- planning referanslari:
  - `docs/guides/economy-abuse-strategy-guide.md`
  - `docs/guides/night-market-and-missions-strategy-guide.md`

### 3. Night Market / Missions Planning
- night market acele implemente edilmeyecek
- once economy guardrail ve admin observability yeterli seviyeye gelmeli
- gorev sistemi, rozetler, banner ve geri donus motivasyonu birlikte dusunulmeli
- planning rehberi:
  - `docs/guides/night-market-and-missions-strategy-guide.md`

### 4. Cache / Rate Limit Foundation
- Redis/Valkey abstraction
- development memory fallback
- production shared cache and rate limit store
- room/lobi multi-instance mimarisine hazirlik
- PM2 multi-instance ve websocket koordinasyon notlari:
  - `docs/cache-and-storage-strategy.md`

## Son Tamamlanan Dilim
### `fix/admin-content-ops`
- duyuru player kart dili sade ve compact hale getirildi
- duplicate metin ve oyuncuya anlamsiz metadata kaldirildi
- admin preview oyuncu renderina yaklastirildi
- kelime bulk upload iki modlu hale geldi
- partial success / skipped / error raporu eklendi
- sayfa bazli bulk selection ve guvenli bulk delete eklendi

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
