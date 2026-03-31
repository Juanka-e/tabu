# Kalan Isler

> Son guncelleme: 31 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/admin-user-observability`
2. `feature/economy-abuse-hardening`
3. `feature/night-market-foundation`
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

### 1. Admin User Observability
- kullanici listesi ve detayinda IP / son gorulme / temel operasyon baglamini guclendirme
- trusted proxy kararina uygun istemci IP gorunurlugu
- support, moderation ve economy review icin ayni kullanici etrafinda daha guclu gozlem zemini
- branch rehberi:
  - `docs/guides/admin-user-observability-guide.md`

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
### `fix/coin-grants-archive-lifecycle`
- coin grant campaign ve code tarafinda archive lifecycle ayni modele cekildi
- `Tum operasyonel`, `Aktif`, `Pasif`, `Arsiv` filtre semantigi netlesti
- `Pasife al`, `Arşive kaldır`, `Arşivden çıkar` davranislari ayristirildi
- campaign bazli kod ozeti ve arama daraltmasi guclendirildi

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
