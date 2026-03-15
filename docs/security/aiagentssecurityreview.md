# AI Agents Security Review

> Son guncelleme: 15 March 2026
> Branch: `fix/security-review-remediation`
> Kapsam: kullanici auth girisleri, admin auth girisleri, support/coin-grant state-changing API korumalari, duyuru sanitization zinciri, store economy limit korumalari, guest identity ve proxy katmani

## Ozet
- **Yuksek guven bulgu sayisi:** 1
- **Duzeltilen bulgu sayisi:** 1
- **Ek hardening degisikligi:** 1
- **Genel risk seviyesi:** Medium -> Low

## Yuksek Guven Bulgular

### [SEC-001] Untrusted `callbackUrl` ile client-side redirect sink (High)
- **Konum:** [login/page.tsx](D:\gemini_tabu_test\geminitabu\newnextjs\src\app\login\page.tsx), [admin/login/page.tsx](D:\gemini_tabu_test\geminitabu\newnextjs\src\app\admin\login\page.tsx)
- **Guven:** High
- **Sorun:** `callbackUrl` query parametresi `window.location.search` icinden okunup dogrudan `router.push(callbackUrl)` ile kullaniliyordu. Bu deger attacker-controlled idi.
- **Etki:** Harici domaine yonlendirme veya `javascript:` benzeri guvensiz URL sink'leri uzerinden login sonrasi acik redirect/XSS-benzeri davranis olusabilirdi.
- **Duzeltme:** `resolveSafeCallbackUrl()` eklendi. Sadece same-origin ve slash ile baslayan internal path'ler kabul ediliyor. Tum diger degerler güvenli fallback'e donuyor.
- **Durum:** Fixed

## Hardening / Savunma Katmani Iyilestirmeleri

### [HARDEN-001] `/api/support/*` ve `/api/coin-grants/*` proxy origin korumasi kapsamina alindi
- **Konum:** [proxy.ts](D:\gemini_tabu_test\geminitabu\newnextjs\src\proxy.ts)
- **Not:** Bu review'de bunu ayri bir yuksek guven acik olarak raporlamadim. Session cookie davranisi ve JSON-only endpoint yapisi nedeniyle somurulebilir CSRF zinciri icin yuksek guven olusmadi.
- **Yapilan:** Buna ragmen state-changing support ve coin-grant endpoint'leri merkezi `isTrustedStateChangeRequest()` korumasinin matcher kapsamina eklendi.
- **Durum:** Hardened

## Diger AI Raporlarindaki Maddelerin Dogrulama Sonucu

### 1. `tx.discountCampaign.fields.usageLimit` / `tx.couponCode.fields.usageLimit`
- **Karar:** High-confidence bulgu olarak dogrulanmadi.
- **Gerekce:** Kod TypeScript build'den geciyor ve Prisma field reference kullanimina isaret ediyor. Elimizde bunun runtime'da limit bypass urettiðini gosteren somut exploit zinciri yok.
- **Durum:** Raporlanmadi.

### 2. Captcha `soft_fail`
- **Karar:** Guvenlik acigi olarak raporlanmadi.
- **Gerekce:** Bu attacker-controlled bir bypass degil; operator/config policy tercihi. Yanlis prod konfigürasyonu riskidir, uygulama exploit'i degil.
- **Durum:** Policy note olarak kabul edildi, vuln olarak raporlanmadi.

### 3. Regex tabanli announcement sanitizer
- **Karar:** High-confidence bulgu olarak raporlanmadi.
- **Gerekce:** Render zinciri arastirildi: admin create/update ve public visible route ikisinde de `sanitizeAnnouncementContent()` kullaniliyor ve mevcut smoke test kritik payload'lari temizliyor. Regex tabanli sanitizer yapisi savunma acisindan ideal degil, ancak bu review sirasinda somut bir exploitable XSS bypass'i dogrulanmadi.
- **Durum:** Needs verification / future hardening.

### 4. GET route rate limiting eksikligi
- **Karar:** High-confidence guvenlik acigi olarak raporlanmadi.
- **Gerekce:** Bu daha cok kaynak tuketimi / abuse dayanimi konusu. Ayrica cogu agir listeleme yuzeyi auth veya admin auth arkasinda.
- **Durum:** Performance-abuse hardening backlog'unda tutulabilir.

### 5. Guest token `guestToken ??` ifadesi
- **Karar:** Bug veya acik olarak raporlanmadi.
- **Gerekce:** Bu ifade gereksiz olabilir ama exploit veya auth bypass dogurmuyor.

## Baslangictan Sona Kendi Review Tarafimdan Taradigim Alanlar
- login ve admin login redirect zinciri
- proxy auth/origin gate'leri
- support ticket mutation route'lari
- coin grant redeem mutation route'u
- announcement sanitization + render akisi
- store purchase / bundle purchase akisi
- promotion / coupon usage limit rezervasyon mantigi
- guest identity token dogrulamasi
- admin upload ve admin mutation route'lari

## Sonuc
- Bu turda **1 adet yuksek guven gercek bulgu** tespit edildi ve kapatildi.
- Ek olarak support ve coin-grant mutation endpoint'leri proxy origin korumasi altina alinarak savunma katmani guclendirildi.
- Kalan AI agent maddelerinin cogu ya false positive, ya config/policy riski, ya da exploit zinciri yeterince dogrulanmamis hardening notlari olarak degerlendirildi.

## Bu Branch'te Yapilan Degisiklikler
- [safe-callback-url.ts](D:\gemini_tabu_test\geminitabu\newnextjs\src\lib\security\safe-callback-url.ts)
- [login/page.tsx](D:\gemini_tabu_test\geminitabu\newnextjs\src\app\login\page.tsx)
- [admin/login/page.tsx](D:\gemini_tabu_test\geminitabu\newnextjs\src\app\admin\login\page.tsx)
- [proxy.ts](D:\gemini_tabu_test\geminitabu\newnextjs\src\proxy.ts)
- [test-auth-redirect-security.ts](D:\gemini_tabu_test\geminitabu\newnextjs\scripts\test-auth-redirect-security.ts)
