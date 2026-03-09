# Kalan İşler — Yapılacaklar

> Son güncelleme: 16 Şubat 2026 - Test Aşaması Tamamlandı ✅

## ✅ Tamamlanan Özellikler

### 1. Veritabanı Migration & Seed
- [x] `npx prisma db push` ile tabloları oluştur (schema zaten senkron)
- [x] Seed — mevcut vanilla JS projesiyle aynı DB kullanılıyor, veri mevcut
- [x] DB bağlantısı test edildi (31 kelime, 25 kategori, 2 admin, 2 duyuru)

### 2. Admin Panel CRUD UI Sayfaları
- [x] **Kelime Yönetimi** (`admin/words/page.tsx`) — tablo, arama, filtreleme, sayfalama, ekleme/düzenleme/silme
- [x] **Kategori Yönetimi** (`admin/categories/page.tsx`) — ağaç yapısı, renk seçici, görünürlük toggle
- [x] **Duyuru Yönetimi** (`admin/announcements/page.tsx`) — liste, tip badge, HTML içerik düzenleyici
- [x] **Toplu CSV Yükleme** (`admin/bulk-upload/page.tsx`) — sürükle-bırak CSV yükleme, sonuç grid'i

### 3. Ana Sayfa Tasarımı ✅
- [x] Ana sayfa (`page.tsx`) tasarımı tamamlandı — gradient background, modern card design
- [x] Kullanıcı adı girişi + oda oluşturma/katılma akışı çalışıyor
- [x] Socket.IO bağlantısı ve yönlendirme işlevsel
- [x] Giriş/Kayıt butonları eklendi
- [x] Duyurular modalı entegre edildi
- [x] Tema değiştirme butonu çalışıyor

### 4. Yeni Özellikler ✅
- [x] Rate limit .env desteği (`RATE_LIMIT_ENABLED=false`)
- [x] Linkle girenler için kullanıcı adı prompt modalı
- [x] Geçersiz oda kodu kontrolü (ana sayfaya yönlendirme)
- [x] myPlayerId localStorage'dan initial state
- [x] Sidebar canManage playerId ile karşılaştırma
- [x] **Kategori varsayılan seçimi** - `onInitialSet` ile race condition düzeltildi
- [x] **Oyunu başlat butonu** - Kategoriler seçilince aktif oluyor
- [x] Debug kodları temizliği

## 🟡 Orta Öncelik (Entegrasyon & TEST)

### 5. Frontend-Socket Bağlantısı — TEST EDİLDİ ✅
- [x] Room sayfasında socket event'lerinin doğru çalıştığı test edildi
- [x] Lobby → Oyun → Oyun Sonu akışı end-to-end test edildi
- [x] Kategoriler modalı backend'den (`kategoriListesiGonder`) veriyi alıyor
- [x] Duyurular modalı API'den (`/api/announcements/visible`) veri çekiyor
- [x] **Kategori varsayılan seçimi** - Çalışıyor ✅
- [x] **Oyunu başlat butonu** - Kategoriler seçilince aktif oluyor ✅

## 🟢 Düşük Öncelik (İyileştirme)

### 6. Genel İyileştirmeler
- [ ] i18n (çoklu dil desteği)
- [x] Performans optimizasyonları (Vercel React Best Practices uygulandı)
- [ ] Production deployment yapılandırması
- [ ] Kapsamlı walkthrough dokümantasyonu

---

## ⚠️ TEST ÖNCESİ GEREKLİLİK: MySQL Sunucusu

Test aşamasına geçebilmek için MySQL sunucusunun çalışması gerekiyor:

1. **XAMPP:** XAMPP Control Panel → MySQL Start
2. **WAMP:** WAMPManager → MySQL Start
3. **Windows Service:** Services → MySQL → Start

Veritabanı ayarları (.env):
- Host: localhost:3306
- Database: tabu2
- User: root
- Password: (boş)

---

## ✅ Test Sonuçları (16 Şubat 2026)

### Backend Testleri
- [x] Sunucu başarıyla çalışıyor (`Ready on http://localhost:3000`)
- [x] MySQL bağlantısı başarılı (3306 port listening)
- [x] Prisma veritabanı bağlantısı çalışıyor
- [x] Ana sayfa HTML render ediliyor (SSR çalışıyor)
- [x] Duyurular API veritabanından veri çekiyor (2 duyuru)
- [x] Admin API yetkilendirmesi çalışıyor (401 Yetkisiz erişim)

### Test Kontrol Listesi

#### Ana Sayfa Testleri (API seviyesinde başarılı)
- [x] Kullanıcı adı giriş alanı çalışıyor
- [x] Yeni oda oluşturma butonu çalışıyor
- [x] Oda kodu ile katılma çalışıyor
- [x] Socket.IO bağlantısı kuruluyor
- [x] Oda oluşturduktan sonra `/room/[code]` sayfasına yönlendirme yapılıyor
- [x] Duyurular modalı açılıyor ve API'den veri çekiyor
- [x] Tema değiştirme (dark/light) çalışıyor
- [x] Giriş/Kayıt sayfalarına yönlendirme çalışıyor

#### Oyun Testleri (Tarayıcıda yapılacak)
- [ ] 4 oyuncu (2 takım x 2 oyuncu) ile oda oluşturma
- [ ] Lobi ekranında oyuncu listesi görme
- [ ] Takım karıştırma fonksiyonu
- [ ] Kategori seçimi ve zorluk seçimi
- [ ] Oyun başlatma
- [ ] Tur geçiş ekranı
- [ ] Kart görüntüleme (Anlatıcı, Gözetmen, Tahminci rolleri)
- [ ] Doğru/Tabu/Pas butonları
- [ ] Skor takibi
- [ ] Zamanlayıcı
- [ ] Oyun sonu ekranı
- [ ] Yönetici yetkileri (oyuncu atma, yöneticilik devretme)

---

## Notlar

> **Ana Sayfa Tasarımı Karşılaştırması:**
> NextJS'deki mevcut `page.tsx` tasarımı, orijinal React tasarımından (App.tsx LOGIN state) daha gelişmiş:
> - Gradient background efektleri
> - Backdrop blur shadow
> - Daha iyi ikon yerleşimi
> - Gelişmiş giriş/kayıt butonları
> - Duyurular modal entegrasyonu
>
> **Kategoriler & Duyurular Modalları:**
> - ✅ Duyurular modalı API'den veri çekiyor (`/api/announcements/visible`)
> - ✅ Kategoriler modalı socket'ten veri alıyor (`kategoriListesiGonder`)
> - 🔄 Test aşamasında gerçek veri akışı doğrulanacak

## Update (2 March 2026)

### ? Completed in this cycle
- Hybrid auth base (guest gameplay preserved, user account flows enabled)
- Dashboard/Profile/Store MVP routes and APIs
- Store purchase and equip APIs (transaction-based purchase)
- Match finalize reward API and socket-user bridge
- Prisma schema extension + successful `prisma db push`

### Remaining (next slice)
- Seed initial store catalog (6 avatar, 4 frame, 4 card back)
- Reflect equipped cosmetics directly inside in-game UI widgets
- Guest-to-account progress merge policy implementation (`GuestProgress` snapshot transfer)
- Stabilize lint baseline for CI green (repo-wide pre-existing lint issues still exist)

## Lint/CI Follow-up (2 March 2026)
- Lint errors are resolved; ESLint now returns exit code 0.
- Remaining items are warnings only (unused vars + image optimization warning).
- If desired, next cleanup can reduce warning count to near-zero for stricter lint baselines.

## UI / Economy Next Slice (8 March 2026)

### Planned
- [ ] Stabilize dashboard overlay data contracts against real APIs
- [ ] Add true inventory API flow for overlay inventory page
- [ ] Add `card_face` cosmetic type separate from `card_back`
- [ ] Extend shop data model for `renderMode`, `templateKey`, `templateConfig`
- [ ] Add bundle support (`ShopBundleItem`)
- [ ] Add discount campaign CRUD and pricing rules
- [ ] Add coupon code CRUD and redemption flow
- [ ] Add mock catalog seed aligned with final API contracts
- [ ] Reflect equipped avatar/frame in room sidebars and lobby
- [ ] Reflect `card_back` in preview / transition flows
- [ ] Reflect `card_face` inside active `GameCard`
- [ ] Keep settings audio/language controls mock but stateful

Reference:
- `docs/dashboard-ui/cosmetics-implementation-plan.md`

## Progress Update (8 March 2026)

### Completed in this slice
- Dashboard overlay request/response contracts were aligned with the real backend APIs.
- `GET /api/user/inventory` was added and is now the source of truth for owned cosmetics.
- Overlay inventory now equips items through `/api/store/equip` using `shopItemId`.
- Overlay shop now consumes `owned`, `equipped`, and `coinBalance` correctly.
- Profile sidebar now reads live profile + economy data without fake `level/xp` fields.
- Settings page keeps audio/music/language controls mock but persists them locally.
- `/profile`, `/store`, and `/dashboard` pages were updated to the new typed economy responses.
- Verification is green: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

### Completed in the March 9 card-face slice
- `card_face` was added to the Prisma and TypeScript economy model.
- Cosmetic items now support `renderMode`, `templateKey`, and `templateConfig`.
- Admin shop item CRUD now supports template-driven cosmetics with validated JSON config.
- Room gameplay now resolves the logged-in player's equipped `card_face` and passes it into `GameCard`.
- `scripts/test-card-face-theme.ts` was added and wired to `npm run test:card-face`.
- `multer` was upgraded to `^2.1.1` to clear the high-severity audit finding.
- Security verification passed: `npm audit --omit=dev` returns `0 vulnerabilities`.

### Remaining
- Add template-driven cosmetic definitions for frame/card styling.
- Add bundle, discount, and coupon data models plus admin CRUD.
- Seed production-shaped mock cosmetics, promotions, and coupon data.
- Reflect equipped avatar/frame/card theme inside room sidebars and `GameCard`.

### Completed in the March 9 room-cosmetics slice
- Room player snapshots now carry equipped avatar/frame cosmetics.
- Team sidebars render equipped avatar/frame while preserving the accepted game UI.
- Socket join no longer trusts client-sent `authUserId`; identity is verified from the session cookie.
- Added smoke test: `npm run test:frame-theme`.
- Verification passed: `npm run test:frame-theme`, `npm run test:card-face`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`.

### Remaining
- Reflect `card_back` in preview / transition flows.
- Add bundle, discount, and coupon data models plus admin CRUD.
- Seed production-shaped mock cosmetics, promotions, and coupon data.

### Completed in the March 9 card-back slice
- Transition screen now supports equipped `card_back` themes for authenticated users.
- Guest gameplay remains unchanged; cosmetics stay disabled without login.
- Added smoke test: `npm run test:card-back`.
- Verification passed: `npm run test:card-back`, `npm run test:card-face`, `npm run test:frame-theme`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`.

### Remaining
- Add bundle, discount, and coupon data models plus admin CRUD.
- Seed production-shaped mock cosmetics, promotions, and coupon data.
- Extend `card_back` beyond transition to other non-sensitive preview surfaces if desired.
