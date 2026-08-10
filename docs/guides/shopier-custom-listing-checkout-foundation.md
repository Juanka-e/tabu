# Shopier Custom Listing Checkout Foundation

## Karar

Shopier v1 API uygulama tarafında doğrudan ödeme oturumu oluşturmaz. Bunun yerine
ürün oluşturma API'si bir Shopier ürün URL'si döndürür. Hushle ortak bir katalog
ürününe yönlendirme yapmaz; her iç ödeme siparişi için:

- `type=digital`
- `customListing=true`
- `stockQuantity=1`
- `shippingPayer=sellerPays`
- sunucunun belirlediği exact fiyat ve para birimi

ile siparişe özel liste oluşturur. Dönen product ID iç siparişin
`providerSessionReference` alanına bağlanır.

Ortak ürün kullanmak; aynı tutardaki iki siparişi, kullanıcıyı ve webhook sonucunu
güvenli biçimde eşlemeye yetmediği için reddedilmiştir.

## Güvenlik Sınırları

- Yalnız `https://api.shopier.com/v1/products` çağrılır.
- PAT yalnız `Authorization: Bearer` başlığında taşınır; body, DB, audit veya loga yazılmaz.
- Provider redirect takip edilmez.
- Request 10 saniye, response 64 KiB ile sınırlıdır.
- Dönen product ID, `www.shopier.com/{id}` URL'si, başlık, fiyat, para birimi,
  dijital ürün, custom listing, stok ve kargo alanları exact doğrulanır.
- Shopier create endpoint'i idempotency anahtarı yayımlamadığı için timeout sonucu
  otomatik retry edilmez. Attempt `uncertain` olur ve sonraki dilimde reconciliation
  ile çözülür.
- Checkout user/IP dağıtık rate limitlerini ve mevcut rollout/emergency pause
  kontrollerini kullanır.
- Shopier checkout ek kimlik/adres verisini Hushle'da toplamaz. Kullanıcı Shopier
  sayfasında kayıtlı hesabındaki doğrulanmış e-postayı kullanması gerektiğini görür.
- `order.created` webhook'unda e-posta uyuşmazsa sonraki dilimde fulfillment yerine
  manuel inceleme açılacaktır.

## Aktivasyon Durumu

Shopier yalnız canlı API yayımladığı için sahte sandbox modu tanımlanmaz. Foundation
env sözleşmesi:

```env
SHOPIER_PERSONAL_ACCESS_TOKEN=
SHOPIER_PRODUCT_MEDIA_URL=https://cdn.example.com/payments/hushle-product.png
SHOPIER_CHECKOUT_MODE=disabled
SHOPIER_LIVE_ACCEPTANCE_RECORDED=false
SHOPIER_LIVE_ACCEPTANCE_EVIDENCE_FILE=
SHOPIER_LIVE_ACCEPTANCE_EVIDENCE_SHA256=
```

Bu branch'te `adapterAvailable=false` kalır. Aşağıdakiler tamamlanmadan `live` açılamaz:

1. HS256 signed `order.created` ve `refund.updated` webhook doğrulaması.
2. Account ID, timestamp replay window, webhook ID dedupe ve exact order doğrulaması.
3. Order API reconciliation ve belirsiz create kurtarma.
4. Shopier refund API ve ikinci admin onaylı durable attempt.
5. Webhook subscription/scheduler health ve alarm görünümü.
6. Gerçek düşük tutarlı ödeme+iade acceptance kanıtı.
7. Satıcı hesabı, vergi/fatura ve dijital ürün uygunluğunun hukuki/operasyonel onayı.

## Resmi Sözleşme

- API base/version: `https://api.shopier.com/v1/`
- Kimlik doğrulama: PAT veya OAuth 2.0 Bearer token
- API quota: application-user başına 200 istek/dakika
- Webhook: HTTPS, 5 saniyede 200, HS256/HMAC-SHA256, en fazla 9 retry
- Kullanılan yetkiler: `products:write`, ileride `products:read`, `orders:read`,
  `refunds:read`, `refunds:write`

Kaynaklar:

- https://developer.shopier.com/reference/post-products
- https://developer.shopier.com/reference/events-headers-payloads
- https://developer.shopier.com/reference/webhook-configuration
- https://developer.shopier.com/reference/post-refunds
- https://developer.shopier.com/reference/rate-limits
