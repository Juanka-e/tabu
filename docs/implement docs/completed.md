# Tamamlanan Isler

> Son guncelleme: 15 March 2026
> Durum: aktif completed log

## Yayinda Olan Temel Sistemler
- authenticated dashboard shell
- in-game dashboard overlay
- store, inventory, equip, purchase akislari
- bundle / discount / coupon altyapisi
- cosmetic template/image modeli
- room card cosmetics broadcast
- runtime system settings
- captcha entry gates
- admin table foundation
- moderation foundation
- economy liveops controls
- user email foundation
- admin user operations
- admin audit viewer
- coin grant campaigns
- support desk foundation

## Tamamlanan Feature Branch'ler

### 1. `feature/liveops-system-settings-foundation`
- runtime config omurgasi
- maintenance, MOTD, feature toggles
- admin system settings ekrani

### 2. `feature/security-entry-gates`
- Turnstile / reCAPTCHA gate altyapisi
- register / login / room create / guest join enforcement

### 3. `feature/admin-table-foundation`
- ortak admin header, toolbar, pagination, selection yapisi
- words / shop-items / promotions entegrasyonu

### 4. `feature/moderation-foundation`
- suspend / reactivate / note modeli
- `/admin/users`
- moderation event kaydi

### 5. `feature/economy-liveops-controls`
- runtime reward ve fiyat carpanlari
- bundle/coupon/campaign kill switch'leri
- shop liveops durumu

### 6. `feature/user-email-foundation`
- yeni kayitlarda email zorunlu
- legacy hesap uyumu
- profile ve admin users email gorunumu

### 7. `feature/admin-user-operations`
- admin coin ekle / dus operasyonu
- wallet adjustment kayit modeli
- reason zorunlulugu ve audit baglantisi
- negatif bakiye korumasi

### 8. `feature/admin-audit-viewer`
- `/admin/audit` ekrani
- action / resource / role / search filtreleri
- audit metadata ozet gorunumu

### 9. `feature/coin-grant-campaigns`
- `/admin/coin-grants` campaign ve code yonetimi
- login kullanici coin code redeem akisi
- budget / duplicate claim / code limit korumalari

### 10. `feature/support-desk-foundation`
- full-page dashboard ve in-game overlay icin ortak support girisi
- kullanici ticket olusturma ve reply akisi
- admin support kuyrugu, assignee, public reply ve internal note
- support aksiyonlari icin audit log baglantisi

## Tamamlanan Docs-Only Branch'ler
- `docs/cleanup-roadmap-and-encoding`
  - stale roadmap ve tarihsel planning copleri temizlendi
  - aktif dokumanlar sadelestirildi ve karar odakli hale getirildi

## Tamamlanan Onemli Fix Branch'leri
- room regression fix zinciri
- dependency `undici` advisory hotfix
- room hydration ve single inspector yetki duzeltmeleri

## Not
Bu dosya sadece kalici olarak degerli tamamlanmis dilimleri tutar.
Eski gunluk debug notlari ve artik tekrar bakilmayan checklist'ler burada tutulmaz.
