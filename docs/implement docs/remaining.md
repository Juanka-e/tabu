# Kalan Isler

> Son guncelleme: 31 March 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/economy-abuse-hardening`
2. `feature/post-launch-economy-observability-review`
3. `feature/cache-and-rate-limit-foundation`
4. `feature/admin-promotions-ux`
5. `feature/cosmetic-render-upgrade`
6. `feature/admin-cosmetic-authoring`
7. `feature/gameplay-ui-polish`
8. `feature/analytics-event-foundation`
9. `feature/word-analytics-liveops`
10. `feature/post-launch-xp-level-foundation`
11. `feature/post-launch-missions-foundation`
12. `feature/post-launch-night-market-foundation`
13. `feature/release-ops-docs`
14. `docs/encoding-cleanup`
15. `feature/wallet-ledger-foundation`

## En Kritik Acik Isler

### 1. Economy / Abuse Hardening
- guest coin yok kurali ustune hesapli kullanicilar icin reward eligibility
- gunluk ve saatlik coin cap
- ayni oyuncu gruplarinda kademeli coin verim dusurme
- IP/subnet'i tek basina ceza nedeni degil, yumusak suphe sinyali olarak kullanma
- planning referanslari:
  - `docs/guides/economy-abuse-hardening-guide.md`
  - `docs/guides/economy-abuse-strategy-guide.md`
  - `docs/guides/economy-progression-and-pricing-guide.md`
  - `docs/guides/night-market-and-missions-strategy-guide.md`

### 2. Night Market / Missions Planning
- night market acele implemente edilmeyecek
- once economy guardrail ve admin observability yeterli seviyeye gelmeli
- gorev sistemi, rozetler, banner ve geri donus motivasyonu birlikte dusunulmeli
- XP ekrani, gorev ekrani ve event claim akisi acilis oncesi implement edilmeyecek
- bu alanlar urun canliya acildiktan sonra gercek veriyle tekrar kararlandirilacak
- planning rehberi:
  - `docs/guides/night-market-and-missions-strategy-guide.md`
  - `docs/guides/economy-progression-and-pricing-guide.md`

### 3. Cache / Rate Limit Foundation
- Redis/Valkey abstraction
- development memory fallback
- production shared cache and rate limit store
- room/lobi multi-instance mimarisine hazirlik
- PM2 multi-instance ve websocket koordinasyon notlari:
  - `docs/cache-and-storage-strategy.md`

## Aclis Sonrasi Onerilen Implementasyon Sirasi

1. `feature/economy-abuse-hardening`
- reward eligibility
- reward source ayrimi
- audit metadata
- safety ceiling
- repeated-group diminishing returns

2. `feature/post-launch-economy-observability-review`
- gercek coin kazanimi
- store satin alma hizi
- retention ve pacing gozlemi
- ilk ekonomi tuning kararlari

3. `feature/cache-and-rate-limit-foundation`
- shared runtime guardrail ve cache temeli

4. `feature/post-launch-xp-level-foundation`
- yalniz veri bunu gerektirirse
- coin'den ayri ilerleme katmani

5. `feature/post-launch-missions-foundation`
- retention ihtiyaci gercekten varsa
- source-aware reward modeli uzerinde

6. `feature/post-launch-night-market-foundation`
- ancak store ve retention verisi bunu gerekliyse

## Son Tamamlanan Dilim
### `feature/admin-user-observability`
- kullanici listesi ve operasyon yuzeyine trusted access sinyalleri eklendi
- support / inventory / audit derin linkleri kuruldu
- support ve inventory detail panelleri daha zengin baglam bloklariyla guclendirildi
- auth local-dev host trust kirilmasi kapatildi

## Cikarilan Eski Icerik
Bu dosyadan sunlar temizlendi:
- artik tarihsel degeri olmayan ilk migration notlari
- tamamlanmis ve tekrar kullanilmayan test checklist'leri
- bozuk encoding ile kalan eski maddeler
- yeni karar almaya yardim etmeyen brainstorming tekrarlar
