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

- Yalnız sabit `https://api.shopier.com/v1/products` ve
  `https://api.shopier.com/v1/orders` endpoint'leri çağrılır.
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
SHOPIER_WEBHOOK_MODE=disabled
SHOPIER_RECONCILIATION_MODE=disabled
SHOPIER_WEBHOOK_TOKEN=
SHOPIER_ACCOUNT_ID=
SHOPIER_LIVE_ACCEPTANCE_RECORDED=false
SHOPIER_LIVE_ACCEPTANCE_EVIDENCE_FILE=
SHOPIER_LIVE_ACCEPTANCE_EVIDENCE_SHA256=
```

`adapterAvailable=false` kalır. Aşağıdakiler tamamlanmadan production checkout açılamaz:

Tamamlanan webhook katmanı:

- HS256 signed `order.created` doğrulaması
- bağlı olmayan event türlerini inbox'a yazmadan reddeden fail-closed event kapısı
- account ID, 5 dakikalık timestamp replay window ve raw-body digest dedupe
- resmî webhook ID metadata korelasyonu; imzalanmayan ID/timestamp değişikliğine karşı
  dedupe kimliği imzalı payload digest'inden türetilir
- tek dijital ürün, adet 1, exact product/title/tutar/currency doğrulaması
- keyed HMAC e-posta korelasyonu; uyuşmazlıkta teslimat yerine inceleme vakası
- idempotent coin/kozmetik fulfillment ve notification

Tamamlanan reconciliation katmanı:

- ayrı `SHOPIER_RECONCILIATION_MODE=live` aktivasyon kapısı
- timeout sonucu belirsiz ürün oluşturmayı exact ve tekil Product API eşleşmesiyle kurtarma
- sıfır/çoklu ürün eşleşmesinde otomatik create retry veya tahmin yapmama
- ürün ID ile Order API sorgusu; exact line item/totals ve keyed-HMAC alıcı e-postası
  doğrulanmadan fulfillment yapmama
- aktif refund görüldüğünde otomatik grant yerine inceleme vakası
- webhook, job ve admin çağrılarında ortak satır kilidi ve exact-proof işlemcisi

Kalan aktivasyon kapıları:

1. `refund.requested` / `refund.updated` webhook ve Shopier refund API orkestrasyonu.
2. Webhook subscription/scheduler health ve alarm görünümü.
3. Gerçek düşük tutarlı ödeme+iade acceptance kanıtı.
4. Satıcı hesabı, vergi/fatura ve dijital ürün uygunluğunun hukuki/operasyonel onayı.

## Resmi Sözleşme

- API base/version: `https://api.shopier.com/v1/`
- Kimlik doğrulama: PAT veya OAuth 2.0 Bearer token
- API quota: application-user başına 200 istek/dakika
- Webhook: HTTPS, 5 saniyede 200, HS256/HMAC-SHA256, en fazla 9 retry
- Kullanılan yetkiler: `products:write`, ileride `products:read`, `orders:read`,
  `refunds:read`, `refunds:write`

Kaynaklar:

- https://developer.shopier.com/reference/post-products
- https://developer.shopier.com/reference/get-products
- https://developer.shopier.com/reference/get-orders
- https://developer.shopier.com/reference/events-headers-payloads
- https://developer.shopier.com/reference/webhook-configuration
- https://developer.shopier.com/reference/post-refunds
- https://developer.shopier.com/reference/rate-limits
