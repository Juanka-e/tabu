# Ödeme Uzlaştırma ve Ters İşlem Operasyonları

## Mevcut Durum

- PayTR sandbox durum sorgusu yalnız sabit HTTPS endpoint üzerinden, HMAC token,
  timeout ve 16 KiB response sınırıyla yapılır.
- `payment-reconciliation` job'ı eski `awaiting_payment` siparişleri sınırlı batch
  halinde inceler ve Redis global lease kullanır.
- Varsayılan 12 otomatik denemeden sonra provider sorgusu durur; açık vaka manuel
  inceleme için korunur ve sonsuz retry trafiği oluşmaz.
- Tutar, para birimi veya sandbox modu uyuşmazsa sipariş teslim edilmez; tekil bir
  `PaymentReconciliationCase` açılır.
- Provider dönüş/iade kaydı bildirirse otomatik entitlement değişikliği yapılmaz.
- `/admin/payments` sipariş, son webhook, dead-letter ve uzlaştırma durumunu gösterir.

## Reversal Güvenlik Politikası

Admin panelindeki ters işlem PayTR'de para iadesi başlatmaz. Operatör önce provider
panelinde işlemi tamamlar, sonra provider referansı, gerekçe ve sipariş UUID onayıyla
yerel durumu eşitler.

- Kozmetikte yalnız fulfillment `grantResult` içindeki kesin inventory ID'leri
  kaldırılır. Başka kaynaktan kazanılan item korunur.
- Kaldırılan item kuşanılmışsa yalnız ilgili profil slotu temizlenir.
- İşlem sipariş satır kilidi ve sipariş başına unique reversal ile idempotenttir.
- Refund daha sonra chargeback'e dönüşebilir; entitlement ikinci kez kaldırılmaz.
- Coin cüzdanı fungible olduğu ve coin lot modeli bulunmadığı için otomatik coin
  kesintisi yapılmaz. Vaka `manual_review` olur; oynayarak kazanılan coin korunur.
- Oyuncuya yalnız genel durum bildirimi gider. Provider iç hata kodları ve koruma
  ayrıntıları istemciye gönderilmez.

## Çalıştırma

```bash
npm run jobs:run -- payment-reconciliation dry-run
JOBS_ENABLED=true npm run jobs:run -- payment-reconciliation execute
```

Production'da ödeme açılmadan önce hem webhook hem reconciliation scheduler'ı ayrı
olarak kurulmalı ve aşağıdaki onaylar verilmelidir:

```dotenv
PAYMENT_WEBHOOK_SCHEDULE_CONFIGURED=true
PAYMENT_RECONCILIATION_SCHEDULE_CONFIGURED=true
```

## Dead-Letter Retry

Admin retry yalnız `dead_letter` kaydını tekrar kuyruğa alır. Event UUID'si body'de
ikinci kez doğrulanır, admin/IP rate limit uygulanır ve önceki hata/attempt bilgisi
audit metadata'ya yazılır. Retry provider callback imzasını veya sipariş tutar
kontrolünü atlamaz.

## Gelecek Sınırlar

- Live PayTR ve provider refund API ayrı bir onaylı branch'te, resmi sandbox kabul
  testleri ve çift kontrol akışıyla ele alınmalıdır.
- Ücretli coin otomatik geri alma için wallet coin-lot/provenance modeli gerekir.
- Reconciliation alarm metrikleri merkezi observability exporter'a bağlanmalıdır.
- Vaka çözme/ignore notları ve ikinci admin onayı yüksek hacimden önce eklenmelidir.
