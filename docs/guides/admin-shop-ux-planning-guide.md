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

