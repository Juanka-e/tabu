# Payment Webhook Operations

## Veri Ayrımı

- MySQL: doğrulanmış webhook inbox, delivery/attempt sayıları, retry ve dead-letter durumu.
- Redis/Valkey: yalnız jobs runtime global lease ve geçici koordinasyon.
- Redis kaybı webhook event kaybına yol açmaz. En fazla worker geçici olarak çalışmaz; event MySQL'de bekler.
- Upstash REST SDK kullanılmaz. İleride managed Redis gerekirse standart `REDIS_URL` protokolü korunur.

## Güvenlik Kontratı

1. Endpoint session, CSRF, Origin/Referer veya captcha beklemez.
2. Body en fazla `PAYMENT_WEBHOOK_MAX_BODY_BYTES` kadar okunur.
3. Provider adapter raw byte ve gerekli header üzerinden signature/replay doğrulaması yapar.
4. Doğrulama başarısızsa genel `400`; verifier/adapter yoksa `404` dönülür.
5. Yalnız normalize edilmiş bounded alanlar saklanır. Raw body için yalnız SHA-256 tutulur.
6. Durable insert başarısızsa `5xx` dönülerek provider retry yapmaya zorlanır.
7. Inbox yazıldıktan sonra provider'a kendi adapter'ının beklediği hızlı acknowledgement döner.

## Worker

- Dry-run: `npm run jobs:payment-webhook`
- Execute ancak `JOBS_ENABLED=true` ve explicit `execute` ile çalışır.
- İlk provider processor'ı eklenene kadar execute fail-closed durur ve event claim etmez.
- Expired DB claim başka worker tarafından geri alınabilir.
- Retry gecikmesi bounded exponential backoff kullanır; varsayılan maksimum deneme `8`.
- Dead-letter otomatik fulfillment yapmaz. Admin inceleme/reconcile aracı sonraki operasyon dilimidir.

## Adapter Açma Kapısı

Bir provider ancak şu testler tamamlanınca registry'de webhook-ready yapılır:

- resmi sandbox signature fixture,
- bozuk imza, eski timestamp/replay ve body mutation testleri,
- duplicate ve out-of-order delivery testi,
- provider-specific acknowledgement testi,
- canlı düşük tutarlı ödeme + refund smoke,
- Cloudflare/WAF üzerinde challenge olmadan callback doğrulaması.
