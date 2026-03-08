# Magaza + Dashboard Altyapi Notlari

## Hedef
- Misafir girisi korunur.
- Kayitli kullaniciya dashboard, profil ve magaza acilir.
- Altyapi yeni oyun modlari icin genisleyebilir kalir.

## Yapilan Kritik Duzeltmeler
1. Auth ayrimi
- Credentials auth artik hem `user` hem `admin` rolleri ile calisiyor.
- `portal` parametresi eklendi: `portal=user` ve `portal=admin`.
- User login ve admin login ayri akislarla dogrulaniyor.

2. Session modeli
- Session'a `user.id` ve `user.role` eklendi.
- Middleware user ve admin pathlerini ayri koruyor.

3. Socket disconnect bug fix
- Disconnect'te oda referansi silinmeden once aliniyor.
- `socketToRoom.delete` sirasi duzeltildi.

4. Hibrit kimlik
- Oyun kimligi: `playerId` (misafir dahil).
- Hesap kimligi: `userId` (giris yapan kullanici).
- Socket `odaIsteği` payload'ina opsiyonel `authUserId` eklendi.

## Yeni Veri Modelleri (Prisma)
- `UserProfile`
- `Wallet`
- `ShopItem`
- `InventoryItem`
- `Purchase`
- `MatchResult`
- `GuestProgress`
- Enum'lar: `ShopItemType`, `ItemRarity`, `InventorySource`, `PurchaseStatus`

## Yeni API Katmani
### User
- `GET /api/user/me`
- `PATCH /api/user/profile`
- `GET /api/user/dashboard`

### Store
- `GET /api/store/items`
- `POST /api/store/purchase`
- `POST /api/store/equip`

### Game
- `POST /api/game/match/finalize`
  - Oyun bitisinde idempotent odul claim.
  - `roomCode + userId` tekilligi ile tekrar odul engeli.

## Yeni Sayfalar
- `/dashboard`
- `/profile`
- `/store`

## Ekonomi (MVP)
- Tek para birimi: coin.
- Mac sonu odul:
  - Kazanma: `120`
  - Kaybetme/berabere: `40`
- Satin alma tek transaction ile yapiliyor.

## Mimari Notlar
- Misafir akisi bozulmadi; oyun kayitsiz oynanabilir.
- Profil/magaza/dashboard sadece girisli kullanicida acik.
- `MatchResult` modelinde `gameType` alani var, ileride farkli oyun modlari icin hazir.

## Sonraki Adimlar
1. `prisma db push` ile yeni tablolari olustur.
2. Magaza baslangic seed'i ekle (6 avatar, 4 cerceve, 4 kart arkasi).
3. Room UI'da equip edilen kozmetiklerin gorunur yansitmasini tamamla.
4. Guest-to-account merge kuralini (coin snapshot aktarim) aktif et.
## CI / Workflow Notes (March 2, 2026)

- Reviewed `.github/workflows/ci.yml`.
- CI requires: `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, `npx prisma db push --skip-generate`, `npm run build`.
- Current branch changes compile with TypeScript.
- Repo still has pre-existing lint violations outside this feature scope; CI lint job will fail until those are cleaned.

## Hotfix - Hydration Error (March 2, 2026)

- Issue: Theme toggle icon in `src/app/page.tsx` rendered different SVG trees on server/client (`Sun` vs `Moon`), causing hydration mismatch.
- Root cause: Conditional icon render used a theme value that differs before/after hydration.
- Fix: Rendered both icons with CSS dark-mode transitions and removed theme-conditional JSX branching.
- Verification: `npm run lint` and `npm run build` both pass after the change.


## Mevcut Durum Detayi (March 2, 2026)

Bu bolum, su an kodda calisan gercek davranisi ve local DB snapshot'ini aciklar.

### 1) Coin Yonetimi - su an ne var?

- Coin bakiyesi `wallets.coin_balance` alaninda tutulur.
- Her kullanici icin `wallet` ve `userProfile` kaydi `ensureUserCore(userId)` ile garanti edilir.
- Yeni kayit olan kullaniciya baslangicta `0 coin` verilir.
- Mac odul sistemi aktif:
  - Kazanan oyuncu: `120 coin` (`WIN_REWARD`)
  - Kaybeden / berabere: `40 coin` (`LOSS_REWARD`)
- Mac odulu `/api/game/match/finalize` endpoint'i ile yazilir:
  - `match_results` tablosuna kayit olusur
  - Ayni anda `wallet.coin_balance` arttirilir
  - `roomCode + userId` unique oldugu icin cift odul engellenir (idempotent)

### 2) Profil Yonetimi - su an ne var?

- Profil bilgileri `user_profiles` tablosunda:
  - `displayName`
  - `bio`
  - `avatarItemId`, `frameItemId`, `cardBackItemId` (kusanilan kozmetikler)
- `/api/user/me`:
  - session user bilgisi
  - profile
  - inventory
  - wallet
  birlikte doner.
- `/api/user/profile` (PATCH):
  - `displayName` (max 60)
  - `bio` (max 300)
  gunceller.
- Profil sayfasi (`/profile`) su an:
  - profil metin alanlarini kaydetme
  - envanterdeki urunleri kategoriye gore listeleme
  - envanterdeki urunu kusanma (`/api/store/equip`)
  akisini icerir.

### 3) Magaza Yonetimi - su an ne var?

- Magaza urun modeli: `shop_items`
  - `code`, `type`, `name`, `rarity`, `price_coin`, `image_url`, `is_active`, `sort_order`
- Urun tipleri:
  - `avatar`
  - `frame`
  - `card_back`
- `/api/store/items`:
  - sadece `isActive=true` urunleri listeler
  - opsiyonel type filtresi var
- `/api/store/purchase`:
  - login zorunlu
  - urun var mi kontrolu
  - daha once alinmis mi kontrolu
  - coin yeterli mi kontrolu
  - basariliysa tek transaction icinde:
    - coin duser
    - `inventory_items` kaydi olusur
    - `purchases` kaydi olusur
- `/api/store/equip`:
  - urun envanterdeyse profile'daki aktif kozmetik alanina set eder

### 4) Satin Alinan Kozmetikler (Sales/Purchase) - su an ne var?

- Satin alinan urunler iki yerde izlenir:
  - `inventory_items` (kullanici urune sahip mi?)
  - `purchases` (islem kaydi / ne kadara alindi?)
- `inventory_items` tablosunda `(userId, shopItemId)` unique oldugu icin ayni urun ikinci kez alinmaz.
- `purchases.status` su an `completed`/`reverted` enumuna sahip olsa da mevcut akista sadece `completed` yaziliyor.

### 5) Dashboard - su an ne var?

- `/dashboard` ve `/api/user/dashboard` su metrikleri verir:
  - `coinBalance`
  - `totalMatches`
  - `totalCoinEarned`
  - `winRate`
  - son 5 mac kaydi (`recentMatches`)
- UI tarafinda hizli linkler var (oda olustur, odaya katil, magazaya git).

### 6) Local DB Snapshot (anlik durum)

Local veritabani (su anki ortam) icin sayilar:

- `shop_items`: `0`
- `active shop_items`: `0`
- `inventory_items`: `0`
- `purchases`: `0`
- `match_results`: `0`
- `user_profiles`: `1`
- `wallets`: `1` (gorulen bakiye: `userId=1 -> 0 coin`)

Sonuc:
- Magaza satin alma kodu mevcut ama urun olmadigi icin satin alma pratikte calisamaz.
- Coin artisi mac finalize ile geliyor; mac kaydi olmadigi surece bakiye artismaz.

### 7) Bilinen Eksikler / Net Gap Listesi

- ~~Shop seed yok (urun katalogu bos).~~ → Admin panelden ekleme artik mumkun (8 Mart 2026).
- Baslangic bonusu / gunluk odul gibi ek coin kaynagi yok.
- ~~Admin panelde kullanici-wallet-envanter yonetimi sayfasi yok.~~ → `/admin/shop-items` eklendi (8 Mart 2026).
- ~~Satin alma/kusanma akisi API tarafinda var, ama oyun ici kozmetik yansitma halen sinirli.~~ → Overlay sistemi ile magaza/envanter/equip UI tamamlandi (8 Mart 2026).

---

## Dashboard Overlay Sistemi (8 Mart 2026)

### Ne Yapildi?
Stitch tasarim dosyalarindaki (7 HTML) glassmorphism overlay tasarimi React/Next.js bilesenlerine donusturuldu.
Oyun ecrani uzerinde acilan 3-sutunlu overlay: sol icon nav, orta icerik, sag profil sidebar.

### Yeni Dosyalar
- `src/components/game/dashboard-overlay.tsx` — ana overlay container
- `src/components/game/dashboard-nav.tsx` — sol icon sidebar (Dash/Inv/Shop/Settings)
- `src/components/game/dashboard-profile-sidebar.tsx` — sag profil: avatar, XP, Quick Equip
- `src/components/game/dashboard-pages/dash-content.tsx` — stat kartlari + son aktivite
- `src/components/game/dashboard-pages/inventory-content.tsx` — envanter + preview + equip
- `src/components/game/dashboard-pages/shop-content.tsx` — magaza + daily offers + bundles
- `src/components/game/dashboard-pages/settings-content.tsx` — profil/oyun/gizlilik ayarlari

### Degisiklikler
- `src/app/globals.css` — `.glass-overlay`, `.glass-panel`, `.animate-fade-in-up` eklendi
- `src/app/room/[code]/page.tsx` — `showDashboard` state + LayoutDashboard butonu + overlay render
- `docs/dashboard.md` — detayli dokumantasyon

### Entegrasyon
- Dashboard butonu yalnizca giris yapan kullanicilara gorunur (misafir girisi etkilenmez)
- Overlay ESC, backdrop click ve X butonu ile kapanir
- Sayfalar dynamic import ile code-splitting uygulanir

---

## Admin Kozmetik Yonetimi (8 Mart 2026)

### Ne Yapildi?
Admin panelden kozmetik CRUD islemleri yapilabilir hale getirildi.

### Yeni API Rotalari
- `GET/POST /api/admin/shop-items` — liste + olustur
- `GET/PUT/DELETE /api/admin/shop-items/[id]` — detay, guncelle, soft-delete
- `POST /api/admin/shop-items/upload` — gorsel yukleme (2MB, PNG/JPEG/WebP/GIF)

### Yeni Sayfalar
- `/admin/shop-items` — kozmetik yonetim sayfasi (tablo, filtre, modal, gorsel yukleme)

### Degisiklikler
- `src/components/admin/admin-sidebar.tsx` — "Kozmetikler" nav linki eklendi

### Kozmetik Ekleme Akisi
1. Admin → `/admin/shop-items` → "Yeni Ekle"
2. Kod, isim, tur, nadirlik, fiyat + gorsel yukle
3. Kaydet → magazada otomatik gorunur (`isActive=true`)
4. Oyuncu overlay'den satin alir → envanterde equip eder

---

## Ana Sayfa Dashboard (8 Mart 2026)

### Ne Yapildi?
Login olan kullanicinin ana sayfasi (`/`) in-game overlay ile ayni glassmorphism 3-sutun dashboard layout'una donusturuldu.

### Degisiklikler
- `src/components/game/dashboard-overlay.tsx` — `DashboardLayout` shared bilesenine ayrildi
- `src/app/page.tsx` — login kullanici: tam sayfa dashboard + compact header bar
  - Header: Logo + Yeni Oda + Oda Kodu + Duyurular + Tema + Admin + Cikis
  - Body: `DashboardLayout` (Nav | Content | Profile Sidebar)
  - Misafir gorunumu: degismedi (eski basit kart)

### Mimari
```
page.tsx (login user)
  ├── Header bar (compact: logo, Yeni Oda, oda kodu, utils)
  └── glass-panel (full page)
      └── DashboardLayout (shared)
          ├── DashboardNav
          ├── DashboardContent (Dash/Inv/Shop/Settings)
          └── DashboardProfileSidebar
```

---

## Bug Fix — Shop items.slice (8 Mart 2026)

- **Sorun:** `items.slice is not a function` hatasi — `/api/store/items` `{ items: [...] }` donduruyor ama kod `setItems(await res.json())` yapiyor.
- **Problem:** Response objesi dogrudan array olarak kullaniliyordu.
- **Cozum:** `Array.isArray(data) ? data : data.items ?? []` ile her iki formata uyum saglandi.
- **Dosya:** `src/components/game/dashboard-pages/shop-content.tsx`
## 8 Mart 2026 Plan Referansi

Bu dokuman mevcut durum ve yapilan isler icin tutulur.
Detayli uygulanabilir plan ayri dokumanda yazildi:

- `docs/dashboard-ui/cosmetics-implementation-plan.md`

Bu planda netlestirilen ana kararlar:

- kart on yuzu ve kart arka yuzu ayri sistem olacak
- `card_face` yeni tip olarak eklenecek
- avatar agirlikli `image`, frame ve kart temalari agirlikli `template` olacak
- admin panelden kozmetik, bundle, indirim ve kupon yonetimi yapilacak
- settings ekranindaki ses/muzik alanlari mock ama stateful kalacak
- mock veri final API kontratina uyacak, gecici hack mantiginda olmayacak

---

## Dashboard Contract Alignment Update (8 March 2026)

### Bu turda tamamlananlar
- `GET /api/user/inventory` eklendi ve overlay inventory bu endpoint'e gecirildi.
- Overlay inventory artik yalnizca sahip olunan urunleri gosteriyor.
- Equip akisi `/api/store/equip` uzerinden `shopItemId` ile calisiyor.
- Overlay shop artik `/api/store/items` cevabindaki `owned` ve `equipped` alanlarini kullaniyor.
- Satin alma akisi `/api/store/purchase` cevabindaki `coinBalance` alanina baglandi.
- Profile sidebar artik fake `level`, `xp`, `equippedAvatar` gibi alanlari beklemiyor.
- Sidebar veri kaynagi olarak `/api/user/dashboard` + `/api/user/me` birlikte kullaniliyor.
- Settings ekraninda profil alanlari gercek API ile, ses/muzik/dil alanlari ise local-state mock olarak calisiyor.
- `/profile`, `/store` ve `/dashboard` sayfalari yeni economy tipleri ile uyumlu hale getirildi.

### Dogrulama
- `npm run lint` = gecti
- `npx tsc --noEmit` = gecti
- `npm run build` = gecti

### Sonraki teknik faz
- `card_face` modelini eklemek
- kart on / kart arka sistemini ayirmak
- template tabanli kozmetik tanimlarini admin paneline acmak
- bundle / discount / coupon yonetimini eklemek
- production-shaped mock katalog ve kampanya seed'lerini eklemek

---

## Card Face + Template Slice (9 March 2026)

### Veri modeli
- `ShopItemType` artik `card_face` tipini de iceriyor.
- `ShopItem` artik `renderMode`, `templateKey`, `templateConfig` alanlarini tasiyor.
- `UserProfile` artik `cardFaceItemId` ile aktif kart on temasini sakliyor.

### Admin tarafi
- `/admin/shop-items` artik image ve template tabanli urun olusturabiliyor.
- Template urunlerde `templateKey` ve `templateConfig` JSON alanlari formdan yonetiliyor.
- JSON config sadece primitive degerler kabul ediyor; nested serbest veri alinmiyor.
- `avatar` urunleri icin template modu bilerek kapali tutuldu.

### Oyun tarafi
- Room sayfasi giris yapan kullanicinin `card_face` item'ini `/api/user/me` uzerinden okuyor.
- Secili `card_face` icin guvenli resolver calisiyor:
  - destekli renkler yalnizca hex formatinda
  - destekli texture anahtarlari whitelist ile sinirli
  - overlay opacity clamp ediliyor
- `GameCard` artik tema prop'u aliyor ve baslik/govde/footer gorunusunu buna gore degistirebiliyor.
- `card_back` ile `card_face` artik veri modelinde ve equip akisinda ayrik.

### Test ve guvenlik
- Test script eklendi: `npm run test:card-face`
- Dogrulama:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
  - `npm audit --omit=dev`
- Audit bulgusu:
  - `multer < 2.1.1` high severity DoS riski
  - cozum: `multer` `^2.1.1` seviyesine yukseltildi
  - sonuc: `0 vulnerabilities`

### Hala kalanlar
- frame ve `card_back` icin template renderer yuzeyini oyunda kullanmak
- bundle / discount / coupon CRUD
- oyuncu sidebari icin diger kullanicilarin avatar/frame snapshot'larini socket state'e tasimak
