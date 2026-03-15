# Yeni Ozellikler Yol Haritasi

> Son guncelleme: 14 March 2026
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

## Sonraki Oncelikli Branch'ler
10. `feature/support-desk-foundation`
11. `feature/system-notifications-foundation`
12. `feature/admin-access-gateway`
13. `feature/branding-seo-settings`
14. `feature/integration-hub`
15. `feature/dashboard-visual-polish`
16. `feature/store-merchandising`
17. `feature/admin-shop-ux`
18. `feature/admin-promotions-ux`
19. `feature/cosmetic-render-upgrade`
20. `feature/admin-cosmetic-authoring`
21. `feature/gameplay-ui-polish`
22. `feature/analytics-event-foundation`
23. `feature/word-analytics-liveops`
24. `feature/release-ops-docs`
25. `docs/encoding-cleanup`

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

## Support Desk Foundation Slice (14 March 2026, in progress)
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

## Tamamlanan Docs-Only Branch'ler
- `docs/cleanup-roadmap-and-encoding`
  - eski brainstorming/cop roadmap bloklari temizlendi
  - aktif roadmap, completed ve remaining/task dokumanlari sadelestirildi

## Sayisal Durum
- Tamamlanan feature branch sayisi: 9
- Planli toplam branch sayisi: 25
- Kalan branch sayisi: 16

## Notlar
- `fix/*` branch'ler bu sayiya dahil degildir.
- Room regression ve dependency hotfix gibi duzeltmeler roadmap count icinde tutulmaz.
- Bu dosya karar dokumanidir; eski brainstorming metinleri burada tutulmaz.


