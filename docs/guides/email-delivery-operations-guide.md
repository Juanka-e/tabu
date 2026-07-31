# E-posta Teslimat Operasyonları

> Branch: `feature/email-delivery-operations-and-bounce-handling`

## Worker Yarış Güvenliği

Outbox worker mesajı göndermeden önce DB üzerinde süreli bir claim alır. Claim,
`pending -> processing` geçişini mesaj kimliği ve mevcut durum koşuluyla yapar.
Birden fazla job aynı satırı okusa bile yalnız bir worker koşullu update'i kazanır.

- claim süresi 5 dakikadır
- çöken worker'ın `processing` satırı süre sonunda başka worker tarafından alınır
- sonuç yazımı yalnız aynı `claimToken` sahibi tarafından yapılır
- Redis job lease ilk, DB claim ikinci koordinasyon katmanıdır

SMTP dış sistem çağrısı ile DB transaction'ı tek atomik işlem değildir. Sağlayıcı
e-postayı kabul ettikten sonra process DB'yi `sent` yapamadan çökerse claim süresi
sonunda tekrar gönderim olabilir. Sözleşme bu nedenle `at-least-once` teslimattır.
Provider API adaptöründe message ID ve varsa idempotency desteği bu pencereyi
ayrıca daraltmalıdır.

## Bounce Ve Complaint

Provider-bağımsız domain servisi doğrulanmış adaptörden `delivered`, `hard_bounce`
ve `complaint` olaylarını kabul eder. `provider + providerEventId` unique olduğu
için tekrarlar idempotenttir. Hard bounce ve complaint normalize adres için `all`
kapsamlı suppression üretir. Worker bu mesajı sağlayıcıya göndermeden dead-letter'a
taşır.

Nodemailer SMTP standart ve doğrulanabilir bounce/complaint webhook'u sağlamaz.
Bu nedenle dışarı açık genel bir webhook route'u yoktur. SES entegrasyonu geldiğinde
SNS/EventBridge imzasını provider adaptörü doğrulamalı, sonra yalnız normalize
domain event'ini bu servise vermelidir. Ham webhook payload'ı kalıcı tutulmaz.

Provider event kanıtları mevcut dead-letter retention süresiyle (varsayılan 90
gün) bounded batch halinde silinir. Suppression kayıtları ise yanlışlıkla yeniden
gönderim yapılmaması için otomatik retention'a girmez.

## Admin Dead-letter Akışı

`/admin/email-delivery` bounded ve sayfalanmış teslimat görünümüdür.

- otomatik deneme ile manuel retry sayıları ayrıdır
- suppression olan adres retry edilemez
- retry kararı otomatik değildir
- API durum ve suppression'ı server-side yeniden doğrular
- başarılı retry admin audit kaydı üretir
- provider hata ayrıntısı oyuncuya gösterilmez

## Restore Ve Sürüm Uyumu

Bu tablolar MySQL backup kapsamındadır. Eski backup izole DB'ye restore edildikten
sonra güncel Prisma migration'ları uygulanmadan yeni worker başlatılmaz. Cutover
öncesi eski worker durdurulur. Backup sonrası outbox, suppression ve provider event
kayıtları restore ile otomatik birleşmez; incident kayıp veri penceresinde incelenir.
Redis job lease backup'a dahil değildir; source of truth MySQL'dir.

## Gelecek Provider Adaptörü

1. SES SNS/EventBridge signature ve subscription doğrulaması
2. provider message ID'nin gönderim sonucundan outbox'a yazılması
3. event mapping fixture'ları
4. suppression inceleme/kaldırma için ayrı admin yetkisi
5. transactional akıştan ayrı marketing consent/unsubscribe sistemi

## Doğrulama

```bash
npm run test:email-delivery-operations
EMAIL_DELIVERY_OPERATIONS_INTEGRATION=true npm run test:email-delivery-operations-integration
EMAIL_DELIVERY_ADMIN_E2E=true npm run test:email-delivery-admin-e2e
npm run test:prisma-migrations
npm run typecheck:packages
npm run typecheck:web
npm run build
```
