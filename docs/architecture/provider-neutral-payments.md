# Provider-Neutral Payment Architecture

## Ürün Kararı

İlk sürüm kayıtlı oyuncular için `checkout` olacaktır: kozmetik, bundle veya ileride coin paketi satın alma. Oyuncunun gerçek para çektiği `cash-out/payout` ilk kapsamda yoktur. Payout; KYC/AML, vergi, fraud ve ülke bazlı lisans gereksinimleri nedeniyle ayrı hukuki ve teknik projedir.

İlk ticari ürün olarak doğrudan kozmetik/bundle satın alımı, coin top-up'tan daha güvenlidir. Coin satışı chargeback sonrasında harcanmış bakiyenin nasıl geri alınacağını gerektirir; bu politika tamamlanmadan paid coin açılmaz.

## Desteklenecek Sağlayıcı Modeli

Adapter registry aşağıdaki provider ID'lerini taşıyacak:

- `shopier_v2`
- `iyzico`
- `paytr`
- `stripe`
- `lemonsqueezy`

Hepsini aynı anda bağlamak yerine ortak çekirdek tamamlandıktan sonra adapter'lar tek tek sandbox + webhook testleriyle eklenir. Merchant hesabı, ülke uygunluğu, ürün politikası, para birimi, vergi ve sözleşme onayı kod tarafından varsayılmaz.

Admin panelden aktif sağlayıcı değiştirilebilir, fakat:

- değişiklik yalnız yeni siparişleri etkiler,
- açık sipariş kendi `provider` ve `providerConfigVersion` snapshot'ıyla devam eder,
- secret key'ler veritabanına veya admin formuna yazılmaz; env/secret manager'da kalır,
- provider kapatmak webhook doğrulamasını kapatmaz; eski sipariş bildirimleri işlenmeye devam eder,
- para birimi/ürün uyumsuzsa provider seçimi kaydedilemez.

## Paket Yapısı

```text
packages/platform-payments/
  contracts.ts
  order-state-machine.ts
  provider-registry.ts
  webhook-inbox.ts
  adapters/
    shopier-v2.ts
    iyzico.ts
    paytr.ts
    stripe.ts
    lemonsqueezy.ts

apps/web/src/app/api/payments/
  checkout/session/route.ts
  orders/[id]/route.ts
  webhooks/[provider]/route.ts

apps/jobs/src/
  payment-webhook-worker.ts
  payment-reconciliation-worker.ts
```

UI, domain ve provider adapter'ı birbirinden ayrılır. Web ve ileride mobile app aynı payment API contract'ını kullanır.

## Veri Modeli

### PaymentOrder

- internal order ID
- immutable user ID
- provider ve provider config version
- product/price/currency minor-unit snapshot
- status: `created`, `pending_provider`, `awaiting_payment`, `paid`, `fulfilled`, `failed`, `expired`, `refunded`, `chargeback`
- server-generated idempotency key
- provider order/session reference
- created/updated/paid timestamps

### PaymentAttempt

- order ID
- attempt number
- request fingerprint/hash
- provider request ID
- status ve bounded hata kodu
- secret veya kart verisi içermez

### PaymentWebhookEvent

- provider + provider event ID unique constraint
- raw body hash, imza sonucu ve received timestamp
- bounded/encrypted veya retention kontrollü payload
- processing status, retry count ve last error code
- aynı event tekrar geldiğinde fulfillment çalışmaz

### PaymentFulfillment

- order ID unique
- wallet ledger transaction veya entitlement grant reference
- aynı transaction ikinci kez coin/kozmetik yazamaz

## Checkout Güvenliği

1. Kullanıcı authenticated olmalı; session sunucuda tekrar doğrulanır.
2. Suspended/required-email-verification hesabı politika gereği reddedilir.
3. Ürün, fiyat, currency ve verilecek içerik yalnız sunucu kataloğundan snapshot alınır.
4. Checkout create, kullanıcı ID + IP bazında Redis rate limit kullanır.
5. Aynı kullanıcı/idempotency key aynı siparişi döndürür; yeni tahsilat başlatmaz.
6. Provider isteği server-to-server yapılır ve provider destekliyorsa ayrıca idempotency header gönderilir.
7. Başarı redirect'i ödeme kanıtı değildir. Yalnız imzalı webhook veya provider verify/retrieve sonucu siparişi `paid` yapabilir.
8. Fulfillment ve ledger yazımı tek transaction/unique constraint ile atomik olur.
9. İstemciye secret, provider ham hata, fraud kuralı veya başka kullanıcının order ID'si gönderilmez.

## Webhook Güvenliği

- Raw body parse edilmeden önce provider imzası doğrulanır.
- Provider başına ayrı signature adapter kullanılır.
- Stripe event ID, iyzico conversation/payment reference, PayTR merchant order ID ve provider eşdeğerleri dedupe edilir.
- Yanlış imza genel `400` döner ve secret/hashing detayı loglanmaz.
- Geçerli event durable inbox'a yazılınca hızlı provider-specific başarı cevabı dönülür.
- Worker order amount, currency, provider reference ve beklenen state'i tekrar doğrular.
- Out-of-order, duplicate, refund ve chargeback event'leri state machine dışında işlem yapamaz.
- Reconciliation job pending siparişleri provider API üzerinden kontrollü olarak karşılaştırır.

## Rate Limit Ayrımı

- Checkout create: user + IP, düşük limit, idempotent retry toleransı.
- Order status: yalnız order sahibi, kısa cache/poll backoff.
- Webhook: browser limiter kullanılmaz; endpoint/body-size ve invalid-signature burst limiti kullanılır.
- Admin provider değişimi: admin session + RBAC + step-up + audit + düşük mutation limiti.
- Refund/reconcile: yalnız admin/jobs, distributed lock ve audit.

Rate limit hiçbir zaman geçerli webhook tekrarını kalıcı olarak kaybettirmemeli. Sağlayıcı retry davranışı için hızlı inbox kaydı ve idempotent worker şarttır.

## Coin ve Chargeback Politikası

- `payment_topup`, `purchase_spend`, `refund` ve `chargeback` ayrı ledger source olarak kalır.
- Paid coin ile earned coin kaynağı audit'te ayrılır.
- Chargeback geldiğinde kör biçimde bütün bakiyeyi negatife çekmek yerine ilgili paid grant/reward lot'u terslenir.
- Harcanmış paid bakiye varsa hesap manuel inceleme/paid-purchase restriction durumuna alınır; oyunla kazanılmış ödüle otomatik büyük ceza uygulanmaz.
- Kozmetik doğrudan satın alındıysa entitlement revoke/freeze politikası ürün şartlarında açık olmalıdır.

## Adapter Sırası

1. `feature/payment-orders-foundation`: şema, state machine, provider registry, idempotency ve admin readiness.
2. `feature/payment-webhook-inbox`: raw-body signature contract, durable inbox, jobs/retry/reconciliation.
3. `feature/payment-checkout-ui`: kayıtlı kullanıcı checkout/order status UI; mobile API contract parity.
4. İlk Türkiye adapter'ı: merchant hesabına göre `iyzico` veya `paytr`.
5. `shopier_v2` adapter'ı: güncel merchant V2 dokümanı ve sandbox erişimi doğrulandıktan sonra.
6. `stripe` adapter'ı.
7. `lemonsqueezy` adapter'ı; Merchant of Record ürün/ülke uygunluğu doğrulandıktan sonra.
8. Refund, chargeback ve paid-balance operasyon paneli.

Bir adapter production smoke testini geçmeden admin seçim listesinde `Hazır` görünmez.

## Resmi Kaynaklar

- [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions)
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe webhook security](https://docs.stripe.com/webhooks)
- [iyzico webhook ve Signature V3](https://docs.iyzico.com/ek-servisler/webhook)
- [PayTR iFrame API](https://dev.paytr.com/iframe-api)
- [Lemon Squeezy webhook requests](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests)
