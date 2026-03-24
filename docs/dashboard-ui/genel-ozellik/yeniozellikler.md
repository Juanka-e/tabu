# Yeni Ozellikler Yol Haritasi

> Son guncelleme: 23 March 2026
> Durum: aktif roadmap dokumani

## Kullanim Kurali
- Her branch tek konu tasir.
- Her branch icin `review`, `test`, `refactor`, `docs` kapanisi zorunludur.
- Is baslamadan once kapsam netlestirilir.
- Merge sonrasi sayisal durum bu dosyada guncellenir.

## Tamamlanan Feature Branch'ler
1. `feature/liveops-system-settings-foundation`
2. `feature/security-entry-gates`
3. `feature/admin-table-foundation`
4. `feature/moderation-foundation`
5. `feature/economy-liveops-controls`
6. `feature/user-email-foundation`
7. `feature/admin-user-operations`
8. `feature/admin-audit-viewer`
9. `feature/coin-grant-campaigns`
10. `feature/support-desk-foundation`
11. `feature/system-notifications-foundation`
12. `feature/admin-access-gateway`
13. `feature/branding-seo-settings`

## Aktif Teknik Kararlar

### Config Stratejisi
- Secret ve infra baglantilari `.env` icinde kalir.
- Runtime business ayarlari `system_settings` tablosundan yonetilir.
- Kod guvenli fallback degerleri saglar.
- Ayarlar cache ile okunur.

### Captcha Stratejisi
- Birincil provider: `Turnstile`
- Alternatif provider: `reCAPTCHA v3`
- Key'ler `.env` icinde kalir.
- Admin panel sadece davranisi ve aktiflik durumunu yonetir.

### Email Stratejisi
- Yeni kayitlarda email zorunlu.
- Legacy kullanicilar icin email nullable kalir.
- `normalizedEmail` unique alan olarak kullanilir.
- Email verification ve password reset sonraki branch'lere birakildi.

### Coin Guvenligi Stratejisi
- Store discount coupon ile coin dagitim sistemi ayridir.
- Wallet'a deger enjekte eden her akista transaction, actor audit, reason, duplicate claim korumasi, limit ve budget kontrolu zorunludur.

### Gelecek Odeme Stratejisi
- Gercek para ile coin satin alma sistemi, store coin harcamasindan ayri bir domain olarak ele alinacak.
- Uygun zamanda `wallet ledger` omurgasi kurulacak.
- Olasi ileriki branch'ler:
  - `feature/wallet-ledger-foundation`
  - `feature/payment-orders-foundation`
- Amac, `payment_topup`, `purchase_spend`, `coin_grant`, `match_reward`, `refund` gibi hareketleri tek muhasebe zincirinde izlemek.

### Cache ve Veri Ayrimi Stratejisi
- MySQL kalici `source of truth` olarak kalir.
- Redis veya Valkey sadece cache, rate limit ve gecici koordinasyon verisi icin kullanilir.
- Room/lobi state'i PM2 multi-instance uretim ortaminda saf process-memory olarak birakilmayacak.
- Bu konu icin ayri mimari not:
  - `docs/cache-and-storage-strategy.md`

## Sonraki Oncelikli Branch'ler
14. `feature/integration-hub`
15. `feature/dashboard-visual-polish`
16. `feature/cache-and-rate-limit-foundation`
17. `feature/store-merchandising`
18. `feature/admin-shop-ux`
19. `feature/admin-promotions-ux`
20. `feature/cosmetic-render-upgrade`
21. `feature/admin-cosmetic-authoring`
22. `feature/gameplay-ui-polish`
23. `feature/analytics-event-foundation`
24. `feature/word-analytics-liveops`
25. `feature/release-ops-docs`
26. `docs/encoding-cleanup`
27. `feature/wallet-ledger-foundation`

## User Email Foundation Slice (14 March 2026)
- Yeni kayit akisinda email zorunlu hale getirildi.
- `users.email`, `users.normalized_email`, `users.email_verified_at` alanlari eklendi.
- Legacy hesaplar bozulmasin diye email alani nullable tutuldu.
- Kullanici ayarlarinda email goruntuleme ve guncelleme alani eklendi.
- Admin `/admin/users` ekraninda email ve dogrulama durumu gorunur hale geldi.
- Email degistiginde `emailVerifiedAt` sifirlanacak sekilde foundation kuruldu.

## Admin User Operations Slice (14 March 2026)
- Admin `/admin/users` ekranina kontrollu coin operasyon modal'i eklendi.
- Yeni `wallet_adjustments` veri modeli ile actor, hedef kullanici, islem tipi, miktar, reason ve onceki/sonraki bakiye kaydi tutuluyor.
- `credit` ve `debit` islemleri transaction icinde uygulanir hale getirildi.
- Negatif bakiye olusturacak `debit` islemleri server tarafinda engelleniyor.
- Her coin operasyonu hem `wallet_adjustments` tablosuna hem de `audit_logs` icine yaziliyor.
- Coin operasyon route'u admin auth + rate limit ile korunuyor.

## Admin Audit Viewer Slice (14 March 2026)
- Yeni `/admin/audit` ekrani ile audit gecmisi tek panelde izlenebilir hale getirildi.
- `action`, `resourceType`, `actorRole` ve serbest metin arama filtreleri eklendi.
- Audit listeleme API'si admin auth ile korunuyor ve pagination destekliyor.
- Metadata alanlari okunabilir ozet formatinda gosteriliyor.
- Admin sidebar'a audit ekranina hizli erisim eklendi.

## Coin Grant Campaigns Slice (14 March 2026)
- Coin dagitimi, store coupon domaininden ayrilarak campaign + code + claim modeli ile kuruldu.
- Admin `/admin/coin-grants` ekranindan campaign olusturma, guncelleme ve code batch uretimi yapilabilir hale geldi.
- Login kullanici shop ekranindan influencer veya etkinlik kodunu redeem ederek wallet bakiyesine coin ekleyebiliyor.
- Claim akisinda campaign budget, code claim limiti ve user bazli claim limiti transaction icinde korunuyor.
- Coin redemption isleri rate limit ve audit log ile izlenebilir hale getirildi.
- Wallet degisimi event tabanli dinlenir hale getirildi; redeem sonrasi F5 zorunlulugu kalkti.
- Kullanilmamis kayitlarda gercek silme, kullanilmis kayitlarda pasife alma + arsivleme modeli benimsendi.
- `/admin/coin-grants` ekraninda `Aktif / Pasif / Kullanilan / Tukenen / Arsiv` filtreleri, acilir/kapanir campaign kartlari ve sade operasyon gorunumu benimsendi.

## Support Desk Foundation Slice (14 March 2026)
- Support girisi full-page dashboard ve in-game dashboard icinde sol alttaki `Help` ikonu uzerinden acilir hale getirildi.
- Guest oyunculara support girisi acilmadi; support sadece login kullaniciya acik tutuldu.
- `support_tickets` ve `support_ticket_messages` veri modeli eklendi.
- Kullanici tarafinda support sheet icinden:
  - yeni ticket acma
  - kendi ticket'larini gorme
  - kapali olmayan ticket'a reply gonderme
  mumkun hale getirildi.
- User reply akisina 30 saniyelik cooldown eklendi; art arda spam mesaj gonderimi bloklandi.
- Kullanici support sheet'i arka planda periyodik yenilenir hale getirildi; admin cevabi F5 atmadan gorunur oldu.
- `resolved` durumundaki ticket'a kullanici reply ile tekrar `open` donusu kapatildi; yeni durum icin yeni ticket acilmasi zorunlu tutuldu.
- Admin tarafinda `/admin/support` kuyrugu eklendi:
  - status guncelleme
  - priority guncelleme
  - assignee secimi
  - public reply
  - internal note
- Ticket create/reply/admin update/admin message aksiyonlari audit log'a baglandi.
- Realtime bildirim ve inbox bu branch'e alinmadi; sonraki `feature/system-notifications-foundation` icin birakildi.

## System Notifications Foundation Slice (16 March 2026, completed)
- Kullaniciya bagli `notifications` veri modeli eklendi.
- Dashboard icine support'tan ayrik `Inbox` / bell girisi eklendi.
- Ilk dilimde tamamlananlar:
  - bildirim listeleme
  - unread count
  - tekil okundu isaretleme
  - tumunu okundu yapma
  - tekil temizleme
  - toplu temizleme
  - support admin public reply bildirimleri
  - support resolved/closed durum bildirimleri
- Tasarim karari:
  - websocket / realtime yok
  - dusuk frekansli fetch + panel acilisinda yenileme
  - kullanici temizleme aksiyonu hard delete degil, inbox tarafli archive/dismiss mantigi ile calisiyor

## Gelecek Progression Stratejisi
- XP / level sistemi mevcut wallet, audit ve coin grant altyapisini bozmayacak sekilde ayri bir domain olarak ele alinmali.
- Olasi ileriki branch:
  - `feature/progression-foundation`
- Bu yapida seviye odulleri su kaynak tipleriyle modellenebilir:
  - coin reward
  - badge unlock
  - cosmetic unlock
  - title / profile flair
  - seasonal track milestone
  - bundle / code claim entitlement
- Seviye odulu mantigi ileride eklendiginde admin panelden sadece odul tablolarini ve carpanlari yonetmek yeterli olmali; mevcut economy ve audit zinciri korunmali.

## Captcha Provider Policy Karari (15 March 2026)
- Tek aktif provider modeli benimsendi.
  - ayni anda sadece bir captcha provider aktif olur
  - operatör gerekirse admin panelden provider degistirir
- Production davranisi:
  - `strict` enforcement zorunlu
  - prod ortaminda `soft_fail` ile korumayi dusurme serbestligi yok
- Onerilen varsayilan:
  - provider: `turnstile`
  - mode: `invisible`
  - register: acik
  - room create: acik
  - guest join: ihtiyaca gore
  - login: ihtiyaca gore
- `reCAPTCHA v3` ayni anda ikinci katman olarak calismaz.
  - sadece alternatif / yedek provider olarak tutulur
- Admin panel sadelestirme ilkesi:
  - provider secimi
  - korunan akislar
  - turnstile mode
  - provider readiness
  - production strict bilgisi
  - riskli `failMode` secicisini UI'dan kaldirma

## Admin Access Gateway Karari (16 March 2026, completed)
- Admin yuzeyi icin env tabanli merkezi access policy katmani kuruluyor.
- Hedef modlar:
  - `public_login`
  - `restricted_login`
  - `external_gateway`
- Local/dev ortami:
  - localhost icin rahat gelistirme bypass'i
- Production ortami:
  - `fail_closed` davranisi destekleniyor
  - policy eksikse admin login ve admin API kapatilabilir
- Gateway kanit turleri:
  - sabit header + value
  - email header + allowlist / allow-domain
- Bu tasarim ileride Cloudflare Zero Trust gibi edge access sistemleri ile uyumlu olacak sekilde kuruluyor.
- `/admin` shell acilip API'de 403'e dusme yerine, policy fail durumunda sayfa duzeyinde temiz redirect davranisi tamamlandi.
- localhost production-benzeri testlerde Auth.js `UntrustedHost` hatasini onlemek icin `AUTH_TRUST_HOST` destegi eklendi.

## Branding / SEO Settings Slice (23 March 2026, in progress)
- Yeni `branding` namespace'i ile runtime metadata ayarlari system settings modeline ekleniyor.
- Root ve room metadata bu ayarlardan uretiliyor.
- Kapsam:
  - default title
  - title template
  - default description
  - Open Graph image URL
  - favicon URL
  - theme color
  - twitter handle
  - canonical URL
  - `robots.ts`
  - `sitemap.ts`
- Login, register ve store gibi yuzeylerde page-specific metadata eklenecek.
- Admin system settings ekrani section button'lari ile kisitli gorunum moduna aliniyor.
- Open Graph alani icin kisa format ogreticisi ve onizleme kutusu ekleniyor.
- Sonraki tamamlayici dilimler:
  - `fix/system-settings-hardening`
  - `feature/branding-assets-upload`
  - `feature/cache-and-rate-limit-foundation`

## System Settings Hardening Slice (23 March 2026, in progress)
- Admin `system-settings` update route'una ayri write rate limit ekleniyor.
- Branding preview alani dis URL'leri admin tarayicisindan otomatik yuklemeyecek.
- Sadece root-relative guvenli asset path'leri otomatik preview edilecek.
- Upload slice gelene kadar dis URL'ler sadece yeni sekmede acilabilecek.

## Branding Assets Upload Slice (23 March 2026, in progress)
- Branding icin ayri upload route'u kuruluyor:
  - `logo`
  - `favicon`
  - `og`
- Upload edilen dosyalar root-relative guvenli branding path'lerine yaziliyor.
- System settings ekranina media picker benzeri upload aksiyonlari ekleniyor.
- Yuklenen logo artik public ana sayfa ile login/register yuzeylerinde gorunur hale getiriliyor.
- Dashboard yuzeylerinde ek compact asset zorunlulugu kaldiriliyor; dar alanlar sade fallback branding ile calisiyor.
- Branding save sonrasi client-side branding event ile logo, favicon ve theme-color anlik senkronize ediliyor.
- Branding asset alanlarina `Varsayilana don` aksiyonu ekleniyor.
- In-game dashboard kucuk ekranlarda mobile nav ile responsive kullanilir hale getiriliyor.
- Save sonrasi kullanilmayan eski branding asset dosyalari temizleniyor.
- Ana sayfa hero logosu `priority` ile yukleniyor.
- Desktop dashboard header yatay wordmark container'i ile guncelleniyor.
- Logout/navigation sirasinda Turnstile cleanup DOM hatasi vermeyecek sekilde sadeleştiriliyor.
- tekrar kullanilacak rehberler `docs/guides/` altinda toplanmaya baslaniyor.
- Ilk dilim guvenlikleri:
  - PNG / JPEG / WebP
  - signature kontrolu
  - tum branding asset'leri icin 4 MB boyut limiti
  - admin auth
  - rate limit
- Logo kare olmak zorunda degil; yatay wordmark kullanimi guvenli container'larla destekleniyor.

## Integration Hub Slice (24 March 2026, in progress)
- Yeni `/admin/integrations` paneli ekleniyor.
- Ilk dilimde gosterilecek bloklar:
  - database
  - auth core
  - Turnstile
  - reCAPTCHA
  - admin access gateway
  - branding asset storage
  - email outbound
  - Redis / Valkey
- Secret degerler panelde gosterilmeyecek.
- Provider readiness ve env wiring durumu gorunur olacak.
- Henuz bagli olmayan entegrasyonlar `planned` olarak acik sekilde isaretlenecek.

## Tamamlanan Docs-Only Branch'ler
- `docs/cleanup-roadmap-and-encoding`
  - eski brainstorming/cop roadmap bloklari temizlendi
  - aktif roadmap, completed ve remaining/task dokumanlari sadelestirildi

## Sayisal Durum
- Tamamlanan feature branch sayisi: 13
- Planli toplam branch sayisi: 28
- Kalan branch sayisi: 15

## Notlar
- `fix/*` branch'ler bu sayiya dahil degildir.
- Room regression ve dependency hotfix gibi duzeltmeler roadmap count icinde tutulmaz.
- Bu dosya karar dokumanidir; eski brainstorming metinleri burada tutulmaz.


