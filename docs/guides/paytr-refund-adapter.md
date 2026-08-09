# PayTR Refund Adapter Foundation

## Mevcut Durum

PayTR'nin tam veya kısmi iade endpoint'i için provider-neutral kontrat ve bounded
transport adapter hazırdır. Bu foundation gerçek para hareketine bağlı değildir:

```env
PAYTR_REFUND_MODE=disabled
```

Production preflight, `PAYTR_REFUND_MODE` için `sandbox` ve `live` değerlerini
reddeder. Admin reversal endpoint'leri refund adapter'ını import etmez veya çağırmaz.

## Adapter Kontratı

- Endpoint yalnız sabit `https://www.paytr.com/odeme/iade` adresidir.
- Token, PayTR'nin belirttiği sırayla `merchant_id + merchant_oid + return_amount
  + merchant_salt` girdisinin HMAC-SHA256 sonucudur.
- Minor-unit tutar tam iki ondalıklı biçime çevrilir; locale bağımlı virgül üretilmez.
- `merchant_oid` ve `reference_no` 1-64 karakter alfanümerik değerlerle sınırlıdır.
- Merchant key ve salt POST body, sonuç, log veya audit verisine eklenmez.
- Timeout 1-30 saniye aralığında, response ise en fazla 16 KiB ile sınırlıdır.
- Başarı cevabındaki sipariş, tutar ve referans istekle birebir eşleşmelidir.
- Provider `err_msg` metni dışarı taşınmaz; yalnız bounded uygulama hata kodu üretilir.

## Bilinçli Güvenlik Sınırı

PayTR `reference_no` alanını kabul eder ancak resmi doküman bunu tekrarlanan refund
istekleri için idempotency garantisi olarak tanımlamaz. Bu nedenle:

- timeout veya bağlantı kopmasında aynı istek kör biçimde tekrarlanmaz,
- provider başarısı kalıcı olarak kanıtlanmadan yerel entitlement reversal yapılmaz,
- mevcut `externally_confirmed` reversal akışı otomatik refund ile karıştırılmaz,
- full ve partial refund ürün/entitlement politikası belirlenmeden admin aksiyonu açılmaz.

Bir sonraki branch durable provider refund attempt modeli, `processing`, `succeeded`,
`failed` ve `uncertain` state machine, tekil reference üretimi, ikinci admin onayı ve durum
sorgusuyla recovery akışını kurmalıdır. Ancak bundan sonra sandbox admin butonu açılır.

## Test

```bash
npm run test:payment-paytr-refund
npm run test:production-preflight
npm run typecheck:packages
```

Testler bağımsız HMAC hesabını, exact decimal tutarı, secret minimizasyonunu, response
eşleşmesini, response boyut sınırını, provider reddini ve app route'larının adapter'a
bağlı olmadığını doğrular.

## Resmi Kaynaklar

- [PayTR İade API](https://dev.paytr.com/iade-api)
- [PayTR Hata Kodları](https://dev.paytr.com/hata-kodlari)
- [PayTR Durum Sorgu API](https://dev.paytr.com/durum-sorgu)
