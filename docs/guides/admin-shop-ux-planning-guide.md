# Admin Shop UX Planning Guide

Bu rehber `feature/admin-shop-ux` branch'inin kapsam sinirini netlestirir.

Amac, admin tarafindaki shop, bundle ve promotion operasyonlarini daha okunur ve buyumeye uygun hale getirmektir.

## Branch Amaci

Bu branch su problemleri cozmelidir:

- shop item listesinin karmasiklasmasi
- featured / active / hidden mantiginin daginik gorunmesi
- coupon / discount / bundle iliskilerinin admin gozunde anlasilmaz kalmasi
- seasonal ve future liveops akislarina hazir bir operasyon yuzeyi olmamasi

Bu branch sonunda admin panel su sorulara hizli cevap verebilmelidir:

1. Bu item aktif olarak magazada gorunuyor mu?
2. Featured mi?
3. Hangi type ve rarity'de?
4. Hangi kampanya veya kuponlarla iliskili?
5. Bundle icinde kullaniliyor mu?
6. Seasonal veya limited gibi merchandising etiketi tasiyor mu?
7. Simdi gorunur ama sonra kapanacak sekilde planlanabiliyor mu?

## Kapsam

Planlanan ana isler:

1. shop item listesi icin daha okunur admin shell
- daha iyi arama
- type / rarity / active / featured filtreleri
- daha net durum rozetleri
- daha iyi tablo veya liste yogunlugu

2. merchandising kontrol dili
- featured
- active / hidden
- badge text
- sort order / vitrin sirasi

3. promotion ve offer baglantilarinin daha gorunur hale gelmesi
- item hangi coupon/discount ile bagli
- bundle icinde kullaniliyor mu
- admin bir item'in magazadaki tum baglamini gorebilmeli

4. gelecege hazir durum modeli
- active
- hidden
- scheduled
- seasonal
- limited
- event-only

5. batch operasyonlari
- toplu activate/deactivate
- toplu featured ac/kapat
- toplu badge temizleme veya duzenleme

## Bilincli Kapsam Disi

Bu branch'te yapilmamasi gerekenler:

1. oyuncu inventory operasyonlari
- grant / revoke
- kullanici inventory inspect

2. night market implementasyonu
- sadece veri ve operasyon ihtiyaclari gozetilir
- feature'in kendisi bu branch'te gelmez

3. economy abuse kurallari
- coin kazanma / reward eligibility
- repetitive group heuristics

4. Redis / cache / PM2 altyapisi

5. oyuncu-facing store redesign
- bu buyuk oranda `feature/store-merchandising` ile geldi
- burada odak admin operasyonudur

## Ekran ve Akis Hedefleri

### Shop Items

- ustte net toolbar
- arama ve hizli filtreler
- liste veya tablo satirinda:
  - gorsel
  - isim
  - code
  - type
  - rarity
  - fiyat
  - featured durumu
  - active durumu
  - bagli bundle/promo sinyalleri

### Promotions

- coupon / discount / bundle yonetimi ayni sayfada kaybolmamalidir
- hedef tipi daha net okunmali:
  - global
  - item
  - bundle
- baslangic / bitis zamani ve aktiflik durumu gorunur olmali

### Merchandising Controls

- admin featured secimini net yapabilmeli
- vitrin mantigi "isFeatured" checkbox seviyesinde kalmamalidir
- hangi item'in neden one ciktigi anlasilir olmali

## Acik Tasarim Kararlari

Bu branch icinde netlestirilecek ve gerekirse revize edilecek noktalar:

1. item ve store offer ayrimi veri modelinde hemen mi yapilacak?
2. scheduled / seasonal / limited alanlari mevcut modele minimal alan ekleyerek mi cozulmeli?
3. promotions sayfasi tek yuzey mi olmali, yoksa coupon / discount / bundle alt bolumleri daha keskin ayrilmali mi?
4. shop item listesi tablo mu olmali yoksa card+table hibrit mi olmali?

## Model Guardrails

Bu kisim sonraki branch'lerde veri modelinin camura donmemesi icin korunmasi gereken kurallari kaydeder.

1. `ShopItem` ile gelecekteki `StoreOffer` ayni sey degildir
- bugunku modelde satis ayarlari halen buyuk oranda `ShopItem` ustunde tasiniyor
- bu yalnizca gecis donemi tercihi olarak kabul edilmelidir
- uzun vadede:
  - `ShopItem` = kozmetigin kendisi
  - `StoreOffer` = magazada nasil ve ne zaman satildigi

2. Yeni canli-ops ihtiyaclari icin rastgele boolean patlatilmamali
- `seasonal`, `limited`, `event-only`, `scheduled` gibi ihtiyaclar icin tekil daginik flag yerine ortak yayin modeli tercih edilmeli
- bu branch'te eklenen minimal model:
  - `availabilityMode`
  - `startsAt`
  - `endsAt`
- yeni branch'lerde ayni probleme ikinci bir alan seti acilmamali

3. Gorunurluk ile sahiplik ayni tabloda cozulmemeli
- bir item'in:
  - magazada gorunmesi
  - bundle icinde satilmasi
  - admin tarafindan grant edilmesi
  - event odulu olmasi
  farkli kavramlardir
- inventory ownership kararlarini `ShopItem` uzerine gommek yasak olmali

4. Night market ve kisisel teklifler icin item degil offer uretilmeli
- oyuncuya ozel indirim
- oyuncuya ozel secili item havuzu
- tekrar olusturulabilir teklif snapshot'i
gibi yapilar dogrudan `ShopItem` alanlariyla cozulmemeli

5. Event-only item mantigi dogrudan direct store katalogundan ayrilmalidir
- bu branch'te `event_only` item'lar dogrudan oyuncu magazasinda listelenmez
- ama ileride:
  - event reward
  - admin grant
  - night market
  - ozel campaign
  kanalinda kullanilabilir kalmalidir

6. Paketler ile item'lar ayni yayin modeline zorlanmamalidir
- bu turda yalniz item gorunurlugu ele alindi
- bundle tarafi daha sonra ayri `offer/liveops` mantigi ile ele alinmali
- aksi halde paketlere item mantigi, item'lara paket mantigi karisir

7. Promotions, coupon ve bundle iliskileri kaynak-gercek olarak kalmali
- item satirinda sadece ozet gorunur
- asil karar kaynaklari:
  - promotions
  - coupons
  - bundles
sayfalari olmali
- iliski bilgisini kopyalayip ikinci truth source olusturmayalim

8. Gelecekte acilabilecek dogru refactor yonu
- `ShopItem`
- `StoreOffer`
- `InventoryOwnership`
- `PersonalizedOffer`
ayrimi

Bu ayrim gelene kadar:
- `availabilityMode`
- `startsAt`
- `endsAt`
- `isFeatured`
- `badgeText`
alanlari yalniz gecis katmani olarak kullanilmalidir

## Merge Kriteri

Bu branch su durumda merge edilir:

1. admin shop ve promotions yuzeyleri daha okunur hale gelmis olmali
2. featured / active / hidden akisi test edilmis olmali
3. item -> promotion / bundle iliskileri admin tarafinda daha gorunur olmali
4. `npx tsc --noEmit` ve `npm run lint` temiz olmali
5. gerekiyorsa ilgili smoke test eklenmis olmali

## Sonraki Branch Baglantisi

Bu branch tamamlandiktan sonra en dogru sonraki adim:

- `feature/admin-inventory-operations`

Sebep:
- katalog operasyonu netlesmeden inventory operasyonu yapmak admin UX'i tekrar karmasiklastirir
- once "ne satiliyor / nasil gorunuyor / nasil yonetiliyor" netlesmeli
- sonra "kime verildi / kimde var / nasil geri alinir" tarafina gecilmeli

