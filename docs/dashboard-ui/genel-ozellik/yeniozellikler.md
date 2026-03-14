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

## Sonraki Oncelikli Branch'ler
7. `feature/admin-user-operations`
8. `feature/admin-audit-viewer`
9. `feature/coin-grant-campaigns`
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

## Sayisal Durum
- Tamamlanan feature branch sayisi: 6
- Planli toplam branch sayisi: 25
- Kalan branch sayisi: 19

## Notlar
- `fix/*` branch'ler bu sayiya dahil degildir.
- Room regression ve dependency hotfix gibi duzeltmeler roadmap count icinde tutulmaz.
- Bu dosya karar dokumanidir; eski brainstorming metinleri burada tutulmaz.
