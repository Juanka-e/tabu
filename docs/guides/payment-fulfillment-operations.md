# Payment Fulfillment Operations

## Kapsam

Bu katman, imzalı provider doğrulamasıyla `paid` durumuna geçmiş bir siparişin
ürününü oyuncuya atomik ve idempotent biçimde teslim eder. Tahsilat başlatmaz ve
PayTR webhook processor'ına henüz bağlı değildir.

Desteklenen server-owned grant snapshot sürümü `1`:

- `coin_pack`: paket başına pozitif `coinAmount`,
- `cosmetic_item`: tam bir kozmetik item ve immutable render snapshot,
- `cosmetic_bundle`: benzersiz item listesi ve her item için render snapshot.

Kozmetik siparişlerinde quantity yalnız `1` olabilir. Coin pack quantity,
snapshot tutarıyla güvenli integer sınırında çarpılır.

## Transaction Değişmezleri

1. Sipariş satırı `SELECT ... FOR UPDATE` ile kilitlenir.
2. Sipariş `paid` olmalı ve `paidAt` taşımalıdır.
3. Grant snapshot ürün türüyle eşleşmelidir.
4. Fulfillment kaydı, wallet/envanter grant'i ve siparişin `fulfilled` geçişi
   aynı MySQL transaction'ında tamamlanır.
5. `PaymentFulfillment.orderId` ve `fulfillmentKey` unique constraint'leri ile
   wallet ledger idempotency anahtarı ikinci grant'i engeller.
6. Redis/Valkey fulfillment, bakiye veya envanter için source of truth değildir.
7. Tamamlanmış grant sonucu yeniden okunurken schema ile tekrar doğrulanır.

Coin pack hareketleri `payment_topup` ledger kaynağını kullanır. Böylece maç
ödülü, coin kodu, admin düzeltmesi ve gerçek para coin'i audit/reconciliation
tarafında birbirine karışmaz.

## Hata Davranışı

Geçersiz snapshot, silinmiş item veya oyuncunun ödeme sırasında ürünü başka bir
yoldan edinmesi sessiz başarı sayılmaz. Sipariş `paid` kalır,
`PaymentFulfillment.status=failed` ve bounded `errorCode` yazılır. Operatör bu
durumda retry, alternatif teslimat veya refund kararı verir.

Bundle içinde tek sahip olunan item varsa transaction tüm bundle'ı reddeder;
diğer item'lar kısmen yazılmaz. Ham provider cevabı, secret, iletişim bilgisi
veya render payload'ı hata alanına yazılmaz.

## Bu Branch Dışında Kalanlar

- PayTR callback processor bağlantısı,
- başarılı fulfillment sonrası notification ve cache invalidation,
- refund/chargeback reversal ledger ve entitlement freeze/revoke politikası,
- admin retry/refund operasyon ekranı,
- provider reconciliation job'u.

Bu işler tamamlanmadan `PAYMENTS_ENABLED=true` yapılmaz. Özellikle coin pack
satışı, harcanmış paid coin'in chargeback durumunda nasıl ele alınacağı
onaylanmadan kataloğa açılmaz.

## Testler

```bash
npm run test:payment-fulfillment
npm run test:payment-fulfillment-integration
```

Integration testi yalnız disposable `tabu_test*` MySQL veritabanında çalışır.
Eşzamanlı duplicate coin fulfillment, kozmetik tekrar teslimi, ödenmemiş
sipariş, geçersiz snapshot ve bundle partial-grant rollback senaryolarını
doğrular.
