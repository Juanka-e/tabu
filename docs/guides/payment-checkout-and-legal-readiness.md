# Payment Checkout and Legal Readiness

## Mevcut Durum

Checkout yüzeyi, server-side teklif kataloğu ve owner-only sipariş durumu API'si
hazırdır. Gerçek tahsilat kapalıdır. İlk provider adapter'ı, webhook processor ve
fulfillment tamamlanmadan `PAYMENTS_ENABLED=true` yapılmamalıdır.

## Hukuki Yüzey Ayrımı

- Ödeme Aydınlatma Metni bilgilendirmedir; zorunlu açık rıza kutusu değildir.
- Açık rıza gerektiren gelecekteki amaçlar ayrı, belirli ve isteğe bağlı olmalıdır.
- Pazarlama/ticari ileti izni checkout veya ürün tesliminin şartı yapılmaz.
- Mesafeli satış ön bilgilendirmesi ve satın alma koşulları ödeme öncesinde açık
  bağlantılarla sunulur; ödeme yükümlülüğü doğuran buton metni saklanmaz.
- Sipariş kanıtı belge sürümleri, kabul zamanı, request ID ve yalnız hash'lenmiş
  user-agent ile tutulur. Ham IP, kart bilgisi veya provider secret saklanmaz.

Kod içindeki metinler işletme bilgileri kesinleşene kadar güvenli taslaktır.
İşletme unvanı/adresi, vergi-MERSİS bilgileri, sağlayıcı/yurt dışı aktarım modeli,
iade-cayma politikası ve yetkili merci bilgileri hukuk danışmanı tarafından nihai
hale getirilmelidir.

## Production Gate

```env
PAYMENTS_ENABLED=false
PAYMENT_LEGAL_APPROVED=false
PAYMENT_LEGAL_BUSINESS_NAME=replace_with_legal_business_name
PAYMENT_LEGAL_BUSINESS_ADDRESS=replace_with_legal_business_address
PAYMENT_LEGAL_CONTACT_EMAIL=replace_with_payment_support_email
PAYMENT_CHECKOUT_TERMS_VERSION=checkout-terms-draft-v1
PAYMENT_PRIVACY_NOTICE_VERSION=payment-privacy-draft-v1
PAYMENT_DISTANCE_SALES_NOTICE_VERSION=distance-sales-draft-v1
```

Metin değiştiğinde ilgili sürüm de değiştirilmelidir. Eski sipariş kendi kabul
ettiği sürümü korur. `PAYMENT_LEGAL_APPROVED=true` yalnız nihai metin ve işletme
bilgileri onaylandıktan sonra kullanılmalıdır.

## Güvenlik Kontrolü

1. Session ve hesap capability server-side doğrulanır.
2. Aktif teklif DB'den yeniden okunur; istemciden tutar/grant kabul edilmez.
3. Legal sürümler güncelse kabul alınır; stale UI `409` ile yeniden okumaya zorlanır.
4. User ve IP limitleri ayrı distributed counter kullanır.
5. İstemci idempotency anahtarı kullanıcıya bağlanır ve request fingerprint ile korunur.
6. Order status sorgusu `id + userId` ile yapılır ve private/no-store döner.
7. Redirect başarı kanıtı sayılmaz; yalnız doğrulanmış webhook/reconciliation sonucu
   siparişi paid durumuna taşıyabilir.

## Sonraki Branch

İlk Türkiye provider adapter'ı merchant hesabı ve sandbox erişimine göre iyzico
veya PayTR olmalıdır. Adapter branch'i provider session create, imza doğrulama,
order state transition, webhook processor, fulfillment ve sandbox Playwright/smoke
testlerini birlikte kapatmalıdır.

## Resmi Referanslar

- [KVKK Aydınlatma Yükümlülüğü Tebliği](https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig)
- [Ticaret Bakanlığı Mesafeli Sözleşmeler Bilgilendirmesi](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme)
