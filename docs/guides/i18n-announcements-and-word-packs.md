# i18n, Duyuru ve Kelime Paketi Rehberi

## Kapsam

Web istemcisi ilk aşamada yalnız `tr` ve `en` arayüz dillerini destekler. Yeni
bir dil, sözlük anahtarları tamamlanmadan desteklenen locale listesine eklenmez.
Admin operasyon ekranlarının dili Türkçe kalabilir; oyuncuya açık ana akışlar
aynı sözlük kontratını kullanır.

Arayüz dili ve oyun içeriği dili birbirinden ayrıdır:

- arayüz tercihi `hushle_locale` cookie/localStorage değeriyle saklanır;
- aynı tarayıcıdaki sekmeler `storage` olayıyla senkronize olur;
- oda kelime dili `RoomSettings.wordLocale` alanıdır ve sunucu otoritesindedir;
- yalnız oda yöneticisi lobide kelime dilini değiştirebilir;
- oyun başladıktan sonra kelime dili değiştirilemez;
- eski istemci alanı göndermezse güvenli varsayılan `tr` olur.

## Duyuru Modeli

`announcements` kaydı yayınlama, sabitleme, tip, medya ve tarih gibi dil bağımsız
verileri taşır. Metinler `announcement_translations` içinde `(announcement_id,
locale)` tekilliğiyle tutulur. Bu model her yeni dil için kolon ekleme ihtiyacını
ortadan kaldırır.

- Türkçe içerik zorunludur.
- İngilizce içerik isteğe bağlıdır.
- İngilizce eksikse public API Türkçe içeriğe döner.
- `guncelleme`, `duyuru` ve `sss` aynı güvenli yayın akışını kullanır.
- İçerik ham HTML olarak kabul edilmez. Başlık, paragraf, alıntı, liste ve ayraç
  gibi doğrulanan bloklar kullanılır.
- Medya mevcut URL allowlist/sanitizer, admin oturumu, rate limit ve audit
  sınırlarını korur.

Kopyalanan referans sistemdeki TipTap/raw HTML ve process-local rate limit
doğrudan alınmadı. Mevcut yapılandırılmış blok editörü daha dar XSS yüzeyi ve
daha öngörülebilir mobil render sağladığı için korundu. Referans sistemden üç
sekme yaklaşımı, FAQ akışı ve çift dil editör deneyimi alındı.

## Kelime Paketleri

`words.locale` ve `categories.locale` alanları paket sınırıdır. Kelime tekilliği
global değil `(locale, wordText)` bazındadır; aynı yazım farklı paketlerde
bulunabilir.

Sunucu kontrolleri:

- kelime yalnız aynı locale kategorilerine bağlanabilir;
- parent/child kategoriler aynı locale içinde kalır;
- kategori taşıma/silme iki dil arasında yapılamaz;
- reorder isteği locale taşır ve yalnız o paketin köklerini kapsar;
- socket başlangıcında kategori ID'leri odanın locale görünür listesine göre
  yeniden doğrulanır;
- locale değişince eski kategori seçimi ve kelime havuzu temizlenir.

İngilizce paket boş olabilir. Bu durumda oyuncuya boş kategori durumu gösterilir
ve kategori olmadan oyun başlatılamaz; Türkçe kelimeler sessizce karıştırılmaz.

## Yeni Dil Ekleme

1. `SUPPORTED_LOCALES` ve iki sözlükteki tüm anahtar kontratını genişlet.
2. Prisma/API locale şemalarını merkezi locale tipinden üretilecek hale getir.
3. Admin duyuru çeviri sekmesini ekle ve fallback sırasını açıkça belirle.
4. Kelime/kategori import, reorder, taşıma ve socket testlerini yeni locale ile çalıştır.
5. Web ve gelecekteki mobile API locale sözleşmesini aynı sürümde yayınla.

`wordLocale` additive socket alanıdır. Eski istemciler Türkçe varsayılanla
çalışır. Desteklenen değerleri veya event semantiğini kıran değişiklikte socket
protokol sürümü artırılmalıdır.

## Test Kapıları

- `npm run test:i18n-content-locales`
- `npm run test:i18n-content-locales-integration`
- `npm run test:announcement-security`
- `npm run test:announcement-structure`
- `npm run test:domain-game`
- `npm run test:room-socket-security`
- `npm run typecheck:web`
- `npm run build`

Migration gerçek MySQL test veritabanında uygulanmalı; mevcut duyuru sayısı ile
backfill edilen Türkçe translation sayısı karşılaştırılmalıdır.
