# Payment Checkout and Legal Readiness

## Mevcut Durum

Server-priced teklif kataloğu, owner-only sipariş durumu, immutable legal consent,
atomik fulfillment ve PayTR sandbox iFrame orchestration hazırdır. Gerçek tahsilat
kapalıdır. Sandbox callback processor hazırdır; refund/chargeback, reconciliation
ve operasyon smoke testleri tamamlanmadan live moda geçilmez.

## Hukuki Yüzey Ayrımı

- Ödeme Aydınlatma Metni bilgilendirmedir; zorunlu açık rıza kutusu değildir.
- Pazarlama/ticari ileti izni checkout veya teslimat şartı yapılmaz.
- Mesafeli satış ön bilgilendirmesi ve satın alma koşulları ayrı bağlantılarla
  gösterilir.
- Sipariş kanıtında belge sürümü, kabul zamanı, request ID ve hash'lenmiş user-agent
  tutulur. Ham IP veya kart verisi tutulmaz.
- PayTR için geçici alınan ad-soyad, telefon ve adresin aktarım amacı ödeme
  aydınlatmasında açıkça belirtilir.

Kod metinleri işletme bilgileri kesinleşene kadar taslaktır. Unvan/adres,
vergi-MERSİS bilgileri, sağlayıcı ve yurt dışı aktarım modeli, iade-cayma politikası
ve yetkili merci bilgileri hukuk danışmanı tarafından onaylanmalıdır.

## Sandbox Gate

```env
PAYMENTS_ENABLED=true
PAYMENT_ACTIVE_PROVIDER=paytr
PAYTR_CHECKOUT_MODE=sandbox
JOBS_ENABLED=true
PAYMENT_WEBHOOK_SCHEDULE_CONFIGURED=true
PAYMENT_LEGAL_APPROVED=true
PAYMENT_LEGAL_BUSINESS_NAME=...
PAYMENT_LEGAL_BUSINESS_ADDRESS=...
PAYMENT_LEGAL_CONTACT_EMAIL=...
PAYMENT_CHECKOUT_TERMS_VERSION=checkout-terms-v1
PAYMENT_PRIVACY_NOTICE_VERSION=payment-privacy-v1
PAYMENT_DISTANCE_SALES_NOTICE_VERSION=distance-sales-v1
```

Production preflight ödeme açıldığında PayTR sandbox mode, credential ve hukuk
alanlarını birlikte doğrular. `PAYTR_CHECKOUT_MODE=live` bu sürümde blocker'dır.
Normal production yayında callback zinciri bitene kadar `PAYMENTS_ENABLED=false`
kalmalıdır.

Metin değiştiğinde ilgili sürüm artırılır. Eski sipariş kabul ettiği belge
sürümlerini korur. `PAYMENT_LEGAL_APPROVED=true` yalnız nihai metin ve işletme
bilgileri onaylandıktan sonra kullanılır.

## Güvenlik Kontrolü

1. Session, doğrulanmış e-posta ve hesap capability server-side doğrulanır.
2. Teklif DB'den yeniden okunur; istemciden fiyat, para birimi veya grant alınmaz.
3. Legal sürüm stale ise API `409` döndürür.
4. User ve IP limitleri ayrı distributed counter kullanır.
5. Idempotency anahtarı kullanıcı ve request fingerprint ile korunur.
6. Order status `id + userId` ile okunur ve private/no-store döner.
7. Provider çağrısı DB transaction'ı dışında çalışır; attempt lease concurrent
   token isteklerini sınırlar.
8. Redirect ödeme kanıtı değildir; yalnız imzalı webhook/reconciliation sonucu
   siparişi `paid` yapabilir.

## Sonraki Branch

`feature/payment-reconciliation-and-reversal-foundation` refund/chargeback state,
ledger veya entitlement reversal, dead-letter inceleme/retry ve provider
reconciliation sınırlarını tamamlayacaktır.
