# Apps Workspace

Bu klasor repo'yu uzun vadede `apps/` + `packages/` yapisina tasimak icin acildi.

Amac:

- tek Next.js uygulamasini zamanla daha net sinirlara ayirmak
- yeni web yuzeyleri veya oyun modlari eklerken mevcut uygulamayi sisirmemek
- mobil uygulama icin daha temiz API/BFF ayrimi hazirlamak
- realtime, jobs ve API katmanlarini gerektiginde ayri deploy edilebilir hale getirmek

## Hedef Yapi

```text
apps/
  web/        -> mevcut Next.js oyuncu + admin uygulamasi
  api/        -> gelecekte mobil/public API veya backend gateway
  jobs/       -> scheduled jobs, retention, archive, background workflows
```

## Simdiki Karar

Bu repo su anda halen tek uygulama olarak calisiyor.

Root `package.json`, `apps/*` ve `packages/*` yollarini npm workspace siniri
olarak ayirir. Mevcut uygulama extraction tamamlanana kadar repo kokunden
calismaya devam eder.

Bu klasorun eklenmesi:

- hemen kod tasima baslatmak icin degil
- kontrollu migration plani icin

## Migration Kurali

1. once klasor ve dokuman sinirlari olusur
2. sonra paylasilan domain/platform kodlari `packages/` altina cikar
3. en son runtime ayirma yapilir

Bu siralama gereksiz kisa vadeli kirilmalarin onune gecer.
