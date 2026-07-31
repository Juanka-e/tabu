# Parola ve Login Koruması

> Branch: `feature/auth-password-policy-and-login-limits`
>
> Durum: web kayıt, web login ve mobile API login için uygulanmıştır.

## Parola Politikası

Yeni hesap parolaları tarayıcı ve sunucunun ortak kullandığı
`@hushle/auth-policy` paketiyle değerlendirilir:

- minimum 8 karakter
- bcrypt uyumluluğu için maksimum 72 UTF-8 byte
- `zxcvbn-ts` skoru en az 3
- kullanıcı adı, e-posta yerel kısmı ve ürün terimleri tahmin girdisi
- zorunlu büyük harf, sayı veya sembol kompozisyon kuralı yok

Kayıt ekranındaki gösterge yalnız kullanıcı deneyimidir. Kabul kararı sunucuda
aynı paketle tekrar verilir. Eski bcrypt hashleri ve mevcut kullanıcıların
parolaları değiştirilmez.

## Sızdırılmış Parola Kontrolü

Yerel politika geçen yeni parolalar HIBP Pwned Passwords range API ile kontrol
edilir. Parolanın kendisi gönderilmez; SHA-1 özetinin yalnız ilk 5 karakteri
gönderilir ve padded cevap içinden kalan özet yerelde eşleştirilir.

- bilinen sızdırılmış parola reddedilir
- servis timeout süresi 2,5 saniyedir
- servis erişilemezse güçlü yerel politika uygulanmaya devam eder
- `PASSWORD_BREACH_CHECK_ENABLED=false` yalnız kontrollü geliştirme veya acil
  provider kesintisi için kullanılmalıdır

## Login Rate Limit

Web Auth.js ve mobile API aynı Redis sayaçlarını kullanır. Sayaçlar yalnız
geçersiz kullanıcı adı/parola sonucunda artar:

| Sayaç | Eşik | Pencere |
| --- | ---: | ---: |
| Normalize hesap adı | 8 başarısızlık | 15 dakika |
| IP | 30 başarısızlık | 10 dakika |

Hesap sayacı IP'den bağımsızdır; dağıtık saldırıyı sınırlar. IP sayacı hesaptan
bağımsızdır; tek kaynaktan farklı hesaplara credential stuffing girişimini
sınırlar. Başarılı giriş hesap sayacını temizler, IP sayacını temizlemez.
Üçüncü hesap başarısızlığından sonra gecikme 250 ms adımlarla artar ve en
fazla 1,5 saniyeye ulaşır.

Redis yoksa 10.000 anahtarla sınırlı process-local fallback devreye girer.
Production'da Redis sağlık ve fallback uyarıları izlenmelidir.

## Gizlilik ve Hata Davranışı

- Login cevabı kullanıcı adının varlığını açıklamaz.
- Var olmayan kullanıcı için de bcrypt karşılaştırması yapılır.
- Sayaç anahtarlarında kullanıcı adı ve IP yerine SHA-256 özet kullanılır.
- Parola, token veya hash loglanmaz.
- Askıya alınmış hesaplar generic login başarısızlığı almaya devam eder.

## Doğrulama

```bash
npm run test:auth-password-policy
npm run test:auth-login-rate-limit
npm run test:package-boundaries
npm run typecheck:packages
npx tsc --noEmit -p tsconfig.json
```

## Sonraki Güvenlik Dilimleri

1. E-posta doğrulama ve tek kullanımlık parola kurtarma tokenları
2. Adaptif Turnstile `CAPTCHA_REQUIRED` step-up akışı
3. Admin için Cloudflare Access MFA
4. Mevcut bcrypt hashlerinin başarılı login sırasında Argon2id'e kademeli
   yükseltilmesi
