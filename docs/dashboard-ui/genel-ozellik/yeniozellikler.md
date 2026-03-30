# Yeni Ozellikler Yol Haritasi

> Son guncelleme: 30 March 2026
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
14. `feature/branding-assets-upload`
15. `feature/integration-hub`
16. `feature/dashboard-visual-polish`
17. `feature/store-merchandising`

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
- Coin economy ve anti-abuse katmanlari icin planning rehberi:
  - `docs/guides/economy-abuse-strategy-guide.md`

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
- Bu konu icin ana mimari not:
  - `docs/cache-and-storage-strategy.md`

### Store ve Liveops Stratejisi
- cosmetic definition, store offer, inventory ownership ve personalized offer alanlari ayrilacak.
- Night market, event reward, admin grant ve normal store satisi ayni modelin icine sikistirilmayacak.
- Ana referans:
  - `docs/guides/store-liveops-strategy-guide.md`

## Sonraki Oncelikli Branch'ler
18. `feature/admin-inventory-operations`
19. `feature/night-market-foundation`
20. `feature/economy-abuse-hardening`
21. `feature/cache-and-rate-limit-foundation`
22. `feature/admin-promotions-ux`
23. `feature/cosmetic-render-upgrade`
24. `feature/admin-cosmetic-authoring`
25. `feature/gameplay-ui-polish`
26. `feature/analytics-event-foundation`
27. `feature/word-analytics-liveops`
28. `feature/release-ops-docs`
29. `docs/encoding-cleanup`
30. `feature/wallet-ledger-foundation`

## Integration Hub Slice (24 March 2026, completed)
- Yeni `/admin/integrations` paneli eklendi.
- Ilk dilimde gosterilen bloklar:
  - database
  - auth core
  - Turnstile
  - reCAPTCHA
  - admin access gateway
  - branding asset storage
  - email outbound
  - Redis / Valkey
- Secret degerler panelde gosterilmedi.
- Provider readiness ve env wiring durumu gorunur hale getirildi.
- Henuz bagli olmayan entegrasyonlar `planned` olarak acik sekilde isaretlendi.
- MySQL gecici erisilemezse app'in sert dusmemesi icin settings fallback eklendi.
- Production deployment guvenligi icin:
  - loopback bind varsayilani
  - token-korumali `/api/health`
  - `docs/guides/deployment-security-guide.md`

## Store / Economy Planning Docs Slice (25 March 2026, docs-only)
- `docs/guides/store-liveops-strategy-guide.md`
- `docs/guides/economy-abuse-strategy-guide.md`
- Store, liveops, inventory ve personalized offer alanlari ayrildi.
- Night market icin:
  - oyuncuya ozel snapshot
  - min / max discount mantigi
  - item pool filtreleme kurallari
  - reroll'u ilk surumde acmama karari
- Economy abuse tarafinda:
  - guest coin yok
  - gunluk cap
  - repetitive group davranisinda hard block yerine kademeli coin verim dusurme
  - IP/subnet'i yumusak suphe sinyali olarak kullanma

## Dashboard / Store Delivery Slice (30 March 2026, completed)
- `feature/dashboard-visual-polish`
  - full-page dashboard ve in-game shell daha tutarli hale geldi
  - responsive ve Turkce dashboard copy temizlendi
- `feature/store-merchandising`
  - magazanin oyuncu-facing merchandising dili guclendirildi
  - preview, kupon, fiyat ve inventory akislarina tutarlilik geldi
  - dashboard sidebar icindeki discovery / store follow-up'lari kapatildi

## Admin Shop UX Slice (30 March 2026, completed)
- `feature/admin-shop-ux`
  - admin `shop-items` ve `promotions` ekranlari toparlandi
  - relation visibility:
    - paket
    - kampanya
    - kupon
    baglantilari gorunur hale geldi
  - `availabilityMode`, `startsAt`, `endsAt` ile future liveops zemini acildi
  - `event_only`, `seasonal`, `limited`, `scheduled` merchandising modeli admin tarafinda yonetilebilir oldu
  - promotion lifecycle:
    - pasife al
    - guvenliyse sil
    olarak netlestirildi

## Tamamlanan Docs-Only Branch'ler
- `docs/cleanup-roadmap-and-encoding`
  - eski brainstorming/cop roadmap bloklari temizlendi
  - aktif roadmap, completed ve remaining/task dokumanlari sadelestirildi

## Sayisal Durum
- Tamamlanan feature branch sayisi: 18
- Planli toplam feature branch sayisi: 30
- Kalan feature branch sayisi: 12

## Notlar
- `fix/*` branch'ler bu sayiya dahil degildir.
- `docs/*` planning branch'leri de feature sayisina dahil degildir.
- Room regression ve dependency hotfix gibi duzeltmeler roadmap count icinde tutulmaz.
- Bu dosya karar dokumanidir; eski brainstorming metinleri burada tutulmaz.
