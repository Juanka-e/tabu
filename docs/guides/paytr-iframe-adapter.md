# PayTR iFrame Adapter Rehberi

## Kapsam

Bu dilim PayTR iFrame API için sağlayıcıya özel kriptografik ve transport
temelini ekler. Gerçek tahsilatı açmaz. `PAYMENTS_ENABLED=false` kalmalı ve
PayTR henüz provider registry içindeki checkout/webhook çalışma yoluna
bağlanmamalıdır.

Tamamlananlar:

- token isteği için resmi alan sırasıyla HMAC-SHA256 üretimi,
- integer minor-unit tutardan deterministik sepet fiyatı üretimi,
- sepet toplamı ile sipariş tutarını adapter sınırında eşitleme,
- sabit PayTR HTTPS token endpoint'i ve bounded timeout/response kontrolü,
- PayTR callback HMAC doğrulaması ve constant-time karşılaştırma,
- duplicate kritik form alanlarını ve bozuk UTF-8/body boyutunu reddetme,
- provider ham hata ayrıntısını istemciye taşımayan bounded hata kodları,
- callback'i provider-neutral webhook event sözleşmesine dönüştürme,
- PayTR'nin beklediği yalnızca `OK` acknowledgement sözleşmesi.

## Veri Minimizasyonu

PayTR token isteği ad-soyad, telefon, adres ve e-posta ister. Uygulama bu
alanları `PaymentOrder`, webhook inbox, audit veya log kayıtlarına kopyalamaz.
Aktivasyon diliminde ad-soyad, telefon ve adres checkout formunda işlem için
geçici alınacak; sunucu tarafındaki PayTR token isteği tamamlandıktan sonra
kalıcı uygulama verisi haline getirilmeyecektir.

E-posta istemciden güvenilir kabul edilmeyecek. Oturumdaki kayıtlı ve
doğrulanmış hesap e-postası sunucudan alınacaktır. Kart verisi uygulama
sunucusundan geçmeyecek ve PayTR iFrame içinde kalacaktır.

Checkout ekranında KVKK aydınlatma bağlantısı ve mesafeli satış ön
bilgilendirmesi mevcut yapıdaki ayrı kutucuk/metin düzenini korur. PayTR'nin
zorunlu iletişim alanlarının hangi amaçla ve kime aktarıldığı ödeme
aydınlatmasında açıkça yazılmadan adapter aktifleştirilmez.

## Güven Sınırı

1. Ürün, fiyat, para birimi ve grant yalnız sunucu teklif snapshot'ından gelir.
2. `merchant_oid` sunucu tarafından üretilen benzersiz sipariş referansıdır.
3. Başarı veya hata yönlendirme URL'si ödeme kanıtı değildir.
4. Yalnız imzası doğrulanan PayTR callback durable inbox'a yazılabilir.
5. Worker callback tutarını, para birimini, provider referansını ve order
   state'ini tekrar doğrulamadan siparişi `paid` yapamaz.
6. Fulfillment unique constraint ve transaction ile idempotent olmadan ürün
   teslim edilmez.
7. Credential değerleri yalnız secret manager/env içinde kalır; admin API,
   browser bundle, log ve veritabanına gönderilmez.

PayTR callback imzasındaki `total_amount`, taksit farkı nedeniyle checkout
tutarından yüksek olabilir. Aktivasyon worker'ı eksik ödemeyi reddetmeli;
beklenen tutardan yüksek signed toplamı kör biçimde ürün miktarına çevirmemeli
ve siparişin immutable fiyat snapshot'ını değiştirmemelidir.

## Aktivasyon İçin Kalanlar

- checkout iletişim alanları ve sunucu tarafı doğrulanmış e-posta kontrolü,
- order attempt ve PayTR token session orchestration,
- verifier'ın webhook registry'ye açıkça bağlanması,
- idempotent order processor ve atomik fulfillment,
- başarısız ödeme, expiry, refund ve chargeback state davranışı,
- sandbox duplicate/out-of-order callback entegrasyon testi,
- düşük tutarlı canlı ödeme ve iade smoke testi,
- Cloudflare üzerinde callback'e challenge uygulanmadığının doğrulanması,
- hukuk tarafından onaylanmış işletme, aydınlatma ve mesafeli satış metinleri.

Bu maddeler tamamlanmadan credential bulunması adapter'ı hazır veya aktif
saymaz.

## Test

```bash
npm run test:payment-paytr-adapter
```

Test; token ve callback HMAC formülünü adapter kodundan bağımsız hesaplar,
değiştirilmiş tutarı, duplicate kimliği, bozuk UTF-8'i, büyük callback'i,
geçersiz sepet toplamını ve provider hata izolasyonunu doğrular.

## Resmi Kaynaklar

- [PayTR iFrame API](https://dev.paytr.com/iframe-api)
- [PayTR iFrame API 1. Adım](https://dev.paytr.com/iframe-api/iframe-api-1-adim)
- [PayTR iFrame API 2. Adım](https://dev.paytr.com/iframe-api/iframe-api-2-adim)
