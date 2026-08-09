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
- `/admin/payments` sipariş, son webhook, dead-letter, bekleyen ikinci onay ve
  uzlaştırma durumunu gösterir.
- Açık vaka ve dead-letter sayıları yapılandırılabilir eşikleri geçtiğinde yalnız
  admin ekranında uyarı oluşur. Oyuncuya otomatik ceza veya bakiye işlemi uygulanmaz.

## Vaka Çözümleme

- Açık vaka `resolved` veya `ignored` kararı, zorunlu operatör notu ve admin kimliğiyle
  kalıcı olarak kaydedilir.
- `resolved` yalnız sipariş terminal durumdaysa kullanılabilir. Böylece ödeme bekleyen
  bir sipariş yanlışlıkla çözülmüş gösterilemez.
- `ignored`, sağlayıcı panelinde bilinçli inceleme sonrasında otomatik sorgulamayı
  durdurur; karar geçmişini silmez.
- Eşikler `PAYMENT_OPEN_CASE_ALERT_THRESHOLD` ve
  `PAYMENT_DEAD_LETTER_ALERT_THRESHOLD` ile belirlenir. Varsayılanlar 25 ve 10'dur.

## Reversal Güvenlik Politikası

Admin panelindeki ters işlem PayTR'de para iadesi başlatmaz. İlk operatör provider
panelinde işlemi tamamlar, sonra provider referansı, gerekçe ve sipariş UUID onayıyla
yerel reversal talebi oluşturur. Talebi oluşturan admin kendi talebini onaylayamaz
veya reddedemez; farklı bir admin talep UUID'si ve zorunlu inceleme notuyla karar verir.

- Kozmetikte yalnız fulfillment `grantResult` içindeki kesin inventory ID'leri
  kaldırılır. Başka kaynaktan kazanılan item korunur.
- Kaldırılan item kuşanılmışsa yalnız ilgili profil slotu temizlenir.
- Talep geçmişi oluşturan, inceleyen, karar ve zaman bilgileriyle korunur.
- Admin rolü API girişinde ve ödeme servisinin transaction'ı içinde yeniden
  doğrulanır; yalnız istemci veya route seviyesindeki kontrole güvenilmez.
- Onay, sipariş satır kilidi altında entitlement değişikliğiyle aynı transaction'da
  uygulanır. Eşzamanlı çift onaydan yalnız biri başarılı olabilir.
- Sipariş başına tek uygulanmış reversal vardır; yeni bekleyen talepler aynı sipariş
  satır kilidiyle seri hale getirilir.
- Refund daha sonra chargeback'e dönüşebilir; entitlement ikinci kez kaldırılmaz.
- Yeni coin fulfillment'ları siparişe tekil lot kanıtı taşır. Reversal yalnız bu
  lotta kalan coinleri `payment_reversal` ledger kaydıyla düşer; earned/grant/admin
  coinlere dokunmaz.
- Harcanmış ücretli coin bakiye eksiye çekilmez. Geri alınabilen miktar otomatik
  uygulanır, harcanmış fark `manual_review` kanıtında operatöre gösterilir.
- Lot özelliğinden önce oluşmuş fulfillment tahmin edilmez ve güvenli biçimde
  `legacy_manual_review_no_wallet_mutation` politikasında kalır.
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

Yerel reversal operasyonu için en az iki ayrı admin hesabı hazır olmalıdır. Bu,
uygulama içindeki ikinci onay kontrolünün operasyonel ön koşuludur.

## Dead-Letter Retry

Admin retry yalnız `dead_letter` kaydını tekrar kuyruğa alır. Event UUID'si body'de
ikinci kez doğrulanır, admin/IP rate limit uygulanır ve önceki hata/attempt bilgisi
audit metadata'ya yazılır. Retry provider callback imzasını veya sipariş tutar
kontrolünü atlamaz.

## Gelecek Sınırlar

- Live PayTR ve provider refund API ayrı bir onaylı branch'te, resmi sandbox kabul
  testleri ve çift kontrol akışıyla ele alınmalıdır.
- Reconciliation alarm metrikleri merkezi observability exporter'a bağlanmalıdır.
- Alarm metrikleri exporter'a bağlandığında eşik aşımı merkezi uyarı kanalına
  yönlendirilmeli; admin sayfasındaki mevcut uyarı yedek görünüm olarak korunmalıdır.
