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
- Wallet'a deger enjekte eden her akista:
  - transaction
  - actor audit
  - reason
  - duplicate claim korumasi
  - limit ve budget kontrolu
zorunludur.

## Sonraki Oncelikli Branch'ler
7. `feature/admin-user-operations`
- coin ekle / sil
- kullanici operasyonlari
- reason ve audit zorunlulugu

8. `feature/admin-audit-viewer`
- `/admin/audit`
- admin islemlerini filtreli ve okunur gorme

9. `feature/coin-grant-campaigns`
- etkinlik / influencer / ozel kod ile coin dagitimi
- budget, claim limit, duplicate claim korumasi

10. `feature/support-desk-foundation`
- ticket modeli
- ticket mesajlari
- status, assignee, internal/public note ayrimi

11. `feature/system-notifications-foundation`
- kullanici notification inbox
- global banner / broadcast ayrimi

12. `feature/admin-access-gateway`
- admin erisim politikasini app-level auth ustune tasima
- prod access gateway / allowlist hazirligi

13. `feature/branding-seo-settings`
- branding, favicon, OG image, meta alanlari

14. `feature/integration-hub`
- analytics ve public integration ayarlari

15. `feature/dashboard-visual-polish`
- dashboard full-page polish
- premium merchandising dili

16. `feature/store-merchandising`
- featured rails
- badge / ordering / vitrin davranisi

17. `feature/admin-shop-ux`
- shop yonetim hizlandirmalari
- filtre / bulk / quick actions

18. `feature/admin-promotions-ux`
- bundle / coupon / discount UX iyilestirmeleri

19. `feature/cosmetic-render-upgrade`
- card/frame render kalitesi ve efektler

20. `feature/admin-cosmetic-authoring`
- preset, preview ve authoring ergonomisi

21. `feature/gameplay-ui-polish`
- oyun ici rol, timer, transition polish

22. `feature/analytics-event-foundation`
- ham event modeli
- urun ve operasyon analytics altyapisi

23. `feature/word-analytics-liveops`
- kelime performans raporlari
- pass/tabu/dogru oranlari

24. `feature/release-ops-docs`
- release checklist
- rollback ve smoke test runbook'lari

25. `docs/encoding-cleanup`
- genis kapsamli UTF-8 ve bozuk metin temizligi

## Sayisal Durum
- Tamamlanan feature branch sayisi: 6
- Planli toplam branch sayisi: 25
- Kalan branch sayisi: 19

## Notlar
- `fix/*` branch'ler bu sayiya dahil degildir.
- Room regression ve dependency hotfix gibi duzeltmeler roadmap count icinde tutulmaz.
- Bu dosya karar dokumanidir; eski brainstorming metinleri burada tutulmaz.
