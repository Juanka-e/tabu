# Payment Fulfillment Operations

## Kapsam

İmzalı PayTR sandbox callback'i tarafından `paid` yapılan siparişin ürününü atomik
ve idempotent teslim eder. Desteklenen grant snapshot sürümü `1`:

- `coin_pack`: pozitif `coinAmount`,
- `cosmetic_item`: tek item ve immutable render snapshot,
- `cosmetic_bundle`: benzersiz item listesi ve render snapshot'ları.

Coin pack ürünleri reversal politikası tamamlanana kadar checkout kataloğunda
gizlidir; çekirdek fulfillment desteği gelecekteki kontrollü aktivasyon içindir.

## Transaction Değişmezleri

1. Sipariş `SELECT ... FOR UPDATE` ile kilitlenir.
2. Sipariş `paid` olmalı ve `paidAt` taşımalıdır.
3. Grant snapshot ürün türüyle eşleşmelidir.
4. Fulfillment, wallet/envanter grant'i ve `fulfilled` geçişi aynı transaction'dadır.
5. Order, fulfillment key ve wallet ledger unique anahtarları ikinci grant'i engeller.
6. Tamamlanmış grant sonucu yeniden okunurken schema ile doğrulanır.
7. Redis bakiye, envanter veya fulfillment source of truth değildir.

Coin pack hareketleri `payment_topup` kaynağını kullanır; maç ödülü, coin kodu ve
admin düzeltmesiyle karışmaz.

## Bildirim

Başarılı fulfillment sonrasında ekonomi bildirimi ayrı row-lock transaction'ında
oluşturulur. `notificationSentAt` aynı transaction'da yazıldığı için event retry veya
worker restart ikinci bildirim üretmez. Bildirim cache invalidation başarısız olsa
bile ürün teslimi geri alınmaz; kısa TTL sonrası MySQL değeri okunur.

## Hata Davranışı

Geçersiz snapshot, eksik item veya zaten sahip olunan item sessiz başarı sayılmaz.
Sipariş `paid` kalır, fulfillment bounded failure taşır ve webhook dead-letter olur.
Operatör retry, alternatif teslimat veya refund kararını reconciliation yüzeyinde
verir. Bundle kısmi teslim edilmez.

## Kalanlar

- refund/chargeback reversal ledger ve entitlement freeze/revoke politikası,
- admin dead-letter retry/refund/reconciliation ekranı,
- provider reconciliation job'ı,
- düşük tutarlı canlı ödeme ve iade smoke testi.

## Testler

```bash
npm run test:payment-fulfillment
npm run test:payment-fulfillment-integration
npm run test:payment-paytr-webhook-integration
```
