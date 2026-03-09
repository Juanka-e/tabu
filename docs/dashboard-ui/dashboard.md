# Dashboard Overlay Sistemi

## Genel Bakış

Dashboard, oyun ekranının üzerinde açılan bir **glassmorphism overlay paneli** olarak çalışır. Oyuncu lobiden veya oyundan ayrılmadan istatistiklerini, envanterini, mağazayı ve ayarlarını yönetebilir. Oyun UI'si arkada blurlu ve düşük opacity'de görünür kalır.

## Mimari Yapı

### Overlay Layout (3 Sütun)

```
┌──────────────────────────────────────────────────┐
│ glass-overlay (backdrop-blur, bg-black/40)        │
│  ┌────────────────────────────────────────────┐   │
│  │  glass-panel (85vh, rounded-3xl)           │   │
│  │  ┌──────┬──────────────┬──────────┐        │   │
│  │  │ Nav  │  Main Content │ Profile  │   [X]  │   │
│  │  │ (80px)│ (scrollable) │ (280px)  │        │   │
│  │  │      │              │          │        │   │
│  │  │ Dash │ Sayfa        │ Avatar   │        │   │
│  │  │ Inv  │ İçeriği      │ Level    │        │   │
│  │  │ Shop │              │ XP Bar   │        │   │
│  │  │ Sett.│              │ Quick    │        │   │
│  │  │      │              │  Equip   │        │   │
│  │  │ Help │              │ Deals    │        │   │
│  │  └──────┴──────────────┴──────────┘        │   │
│  └────────────────────────────────────────────┘   │
│  (oyun ekranı arkada blurlu, opacity: 0.30)       │
└──────────────────────────────────────────────────┘
```

### Sayfalar

| Sayfa | Açıklama | Stitch Dosyası |
|-------|----------|----------------|
| **Dashboard** | İstatistikler (maç, winrate, kelime, tabu), son aktivite | `dashboard.html` |
| **Inventory** | Sahip olunan kozmetikler (Avatar, Frame, Card Back), item preview, equip | `inventory.html` |
| **Shop** | Daily Offers, Avatarlar, Frame'ler, Bundle'lar alt kategorileri | `shop_*.html` |
| **Settings** | Profil (isim, bio), oyun ayarları (ses, müzik, dil), gizlilik, hesap | `settings.html` |

### Sağ Sidebar (Tüm Sayfalarda Sabit)

- Oyuncu avatarı (ileride mağazadan alınan kozmetik)
- Kullanıcı adı + Level
- XP progress bar
- Quick Equip slotları
- Shop Deals / New Arrivals kaydırma alanı
- Server Time footer

---

## Mevcut Durum (Tamamlanan)

### Backend API Katmanı ✅
- `POST /api/user/me` → Profil bilgisi (displayName, bio)
- `GET /api/user/dashboard` → Coin, maç sayısı, winrate, streak, son maçlar
- `GET /api/store/items` → Mağaza ürünleri
- `POST /api/store/purchase` → Satın alma
- `POST /api/user/equip` → Kozmetik kuşanma
- `POST /api/game/match/finalize` → Maç sonu ödül

### Admin API Katmanı ✅ (8 Mart 2026)
- `GET /api/admin/shop-items` → Tüm kozmetikler (pasifler dahil, satış sayısı)
- `POST /api/admin/shop-items` → Yeni kozmetik oluştur
- `GET /api/admin/shop-items/[id]` → Tek item detay
- `PUT /api/admin/shop-items/[id]` → Item güncelle
- `DELETE /api/admin/shop-items/[id]` → Soft delete (isActive=false)
- `POST /api/admin/shop-items/upload` → Görsel yükle → `/public/cosmetics/`

### Prisma Veri Modelleri ✅
- `UserProfile` → displayName, bio, level, xp
- `Wallet` → coin bakiyesi
- `ShopItem` → kozmetik ürünler (avatar, frame, card_back), rarity, fiyat
- `InventoryItem` → sahip olunan ürünler
- `Purchase` → satın alma kaydı
- `MatchResult` → maç sonuçları ve ödüller

### Eski Ayrı Sayfalar (Overlay ile değiştirildi)
- `/dashboard` → eski server component (hala mevcut, opsiyonel kaldırılabilir)
- `/store` → eski client component (hala mevcut, opsiyonel kaldırılabilir)
- `/profile` → eski client component (hala mevcut, opsiyonel kaldırılabilir)

### Stitch Tasarım Dosyaları ✅
- `scripts/stitichdesign/` altında 7 HTML dosyası
- Glassmorphism overlay, responsive grid, dark/light tema desteği
- Material Icons Round kullanımı

---

## Uygulama Durumu (8 Mart 2026)

### Faz 1: Overlay Container ✅

**Dosya:** `src/components/game/dashboard-overlay.tsx`
- `isOpen` / `onClose` props ile kontrol
- Glass-overlay backdrop, glass-panel (85vh, max-w-6xl)
- ✕ butonu, ESC tuşu, backdrop tıklama ile kapatma
- Dynamic import ile sayfa code-splitting

### Faz 2: İç Navigasyon Sidebar ✅

**Dosya:** `src/components/game/dashboard-nav.tsx`
- Lucide ikonlarla 4 tab: Dash, Inv, Shop, Settings + Help
- Aktif tab border-right vurgusu
- Mobil variant (DashboardNavMobile) hazır ama henüz bağlanmadı

### Faz 3: Sağ Profil Sidebar ✅

**Dosya:** `src/components/game/dashboard-profile-sidebar.tsx`
- Harf bazlı avatar, isim, level, XP bar
- Quick Equip slotları
- `GET /api/user/dashboard` ile gerçek data çekiyor
- lg altında gizleniyor

### Faz 4: Sayfa İçerikleri ✅

| Dosya | İçerik |
|-------|--------|
| `dashboard-pages/dash-content.tsx` | 4 stat kartı + coin gösterimi + Recent Activity |
| `dashboard-pages/inventory-content.tsx` | Tab'lı envanter + preview panel + equip/unequip |
| `dashboard-pages/shop-content.tsx` | Daily Offers + Avatars + Frames + Bundles + buy |
| `dashboard-pages/settings-content.tsx` | Profil, ses/müzik toggle, dil, gizlilik, hesap |

### Faz 5: Room Page Entegrasyonu ✅

**Dosya:** `src/app/room/[code]/page.tsx`
- `showDashboard` state
- Header'da `LayoutDashboard` butonu (sadece `session?.user`)
- `<DashboardOverlay>` render ediliyor

### Faz 6: CSS Güncellemesi ✅

**Dosya:** `src/app/globals.css`
- `.glass-overlay`, `.glass-panel`, `.animate-fade-in-up` eklendi

### Faz 7: Admin Kozmetik Yönetimi ✅

**Dosyalar:**
- `src/app/api/admin/shop-items/route.ts` — GET/POST
- `src/app/api/admin/shop-items/[id]/route.ts` — GET/PUT/DELETE
- `src/app/api/admin/shop-items/upload/route.ts` — görsel yükleme
- `src/app/admin/(dashboard)/shop-items/page.tsx` — admin CRUD sayfası
- `src/components/admin/admin-sidebar.tsx` — "Kozmetikler" linki eklendi

### Faz 8: Ana Sayfa Dashboard ✅ (8 Mart 2026)

**Dosyalar:**
- `src/components/game/dashboard-overlay.tsx` — `DashboardLayout` shared bilesenine ayrıldı
- `src/app/page.tsx` — login kullanıcı: tam sayfa glassmorphism dashboard + compact header (Yeni Oda / Oda Kodu / Duyurular / Admin / Çıkış)

Kullanıcı giriş yaptığında aynı 3-sütun dashboard layout'u (Nav | Content | Profile Sidebar) tam sayfa olarak görüntülenir. Misafir görünümü eskisi gibi basit kart olarak kalır.

---

## Responsive Davranış

| Ekran | Nav | Main | Profil Sidebar |
|-------|-----|------|----------------|
| Desktop (≥1024px) | Sol dikey 80px | Ortada flex-1 | Sağ 280px |
| Tablet (768-1023px) | Sol dikey 80px | Ortada flex-1 | Gizli veya altta |
| Mobil (<768px) | Üst yatay bar | Tam genişlik | Altta compact |

Overlay max-w: Desktop'ta `max-w-6xl`, mobilde tam ekran.

---

## Gelecekte Eklenebilecek Özellikler

### Kısa Vadeli
- [ ] **Sezon sistemi:** Shop'ta "Season 4" dinamik badge, sezon bazlı ürünler
- [ ] **Daily Offers timer:** Gerçek zamanlı geri sayım, otomatik refresh
- [ ] **Coin satın alma:** Gerçek para ile coin yükleme (Stripe/iyzico entegrasyonu)
- [ ] **Avatar fotoğrafı:** Mağazadan alınan avatar görseli profilde ve oyun içinde kullanımı
- [ ] **Bildirim badge:** Nav ikonlarına "yeni ürün" veya "ödül" bildirimi

### Orta Vadeli
- [ ] **Arkadaş sistemi:** Arkadaş listesi, online durumu, profil ziyareti
- [ ] **Sıralama tablosu:** Global ve arkadaş bazlı leaderboard
- [ ] **Başarımlar:** Achievement sistemi, badge koleksiyonu
- [ ] **XP sistemi:** Maç bazlı XP kazanma, level atlama, level ödülleri
- [ ] **Bundle sistemi:** Birden fazla kozmetik içeren paketler, indirimli fiyat

### Uzun Vadeli
- [ ] **Battle Pass:** Sezonluk ilerleme sistemi, ücretsiz/premium tier
- [ ] **Trade sistemi:** Oyuncular arası kozmetik takası
- [ ] **Özelleştirilebilir profil:** Arka plan, müzik, profil rozeti
- [ ] **Turnuva sistemi:** Organize turnuvalar, ödül havuzu
- [ ] **Anlık bildirimler:** WebSocket üzerinden gerçek zamanlı dashboard güncellemeleri

---

## Teknik Notlar

### Glassmorphism CSS
```css
.glass-panel {
    background: rgba(255, 255, 255, 0.85);    /* light */
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.6);
}
.dark .glass-panel {
    background: rgba(30, 41, 59, 0.85);       /* dark */
    border: 1px solid rgba(255, 255, 255, 0.1);
}
.glass-overlay {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(6px);
}
```

### İkon Kütüphanesi
Stitch tasarımı Material Icons Round kullanıyor. Projede halihazırda Lucide React var. **Karar: Lucide React ile devam, ikonları eşleştir.**

### Avatar Görselleri
Stitch dosyalarında `lh3.googleusercontent.com` üzerinden temsili fotoğraflar kullanılmış. Gerçek uygulamada:
1. **Şu an:** Harf bazlı avatar (kullanıcı adının ilk harfi)
2. **Yakın gelecek:** Mağazadan alınan kozmetik avatar görseli (`ShopItem.imageUrl`)
3. **Uzak gelecek:** Kullanıcı tarafından yüklenen profil fotoğrafı

### Veri Akışı
```
DashboardOverlay (state: activeTab)
  ├── DashboardNav (tabs, onTabChange)
  ├── DashboardContent (activeTab → ilgili sayfa)
  │   ├── DashPage → GET /api/user/dashboard
  │   ├── InventoryPage → GET /api/store/items + GET /api/user/dashboard
  │   ├── ShopPage → GET /api/store/items + POST /api/store/purchase
  │   └── SettingsPage → GET /api/user/me + POST /api/user/me
  └── ProfileSidebar → GET /api/user/dashboard + equipped items
```

### Admin Veri Akışı
```
Admin Panel → /admin/shop-items
  ├── Liste → GET /api/admin/shop-items (tüm itemlar + satış sayıları)
  ├── Oluştur → POST /api/admin/shop-items
  ├── Güncelle → PUT /api/admin/shop-items/[id]
  ├── Sil → DELETE /api/admin/shop-items/[id] (soft)
  └── Görsel → POST /api/admin/shop-items/upload → /public/cosmetics/
```
## 8 Mart 2026 Plan Referansi

Bu dokuman tasarim ve mevcut durum referansi olarak kalir.
Uygulanabilir teknik plan ayri dokumanda yazildi:

- `docs/dashboard-ui/cosmetics-implementation-plan.md`

Bu plana gore sonraki uygulama dalgasi su alanlari kapsar:

- `card_face` tipinin `card_back`ten ayri eklenmesi
- image ve template bazli kozmetik render mantigi
- bundle, indirim kampanyasi ve kupon kodu veri modeli
- admin panelde template tabanli urun olusturma
- mock veri ve mock settings akisinin final API kontratina uydurulmasi

## 9 Mart 2026 Uygulama Notu

- `card_face` tipi aktif edildi.
- `ShopItem` icin `renderMode`, `templateKey`, `templateConfig` alanlari eklendi.
- `/admin/shop-items` artik image/template ayrimini yonetebiliyor.
- `GameCard` temasi, login kullanicinin equip ettigi `card_face` urununden resolve ediliyor.
- Security:
  - admin ve store/user API korumasi `src/middleware.ts` uzerinden devam ediyor
  - shop item create/update validator'lari artik ortak zod schema uzerinden calisiyor
  - `npm audit --omit=dev` sonucunda bulunan `multer` zafiyeti kapatildi

## 9 March 2026 Update - Room Snapshot Cosmetics

- Room lobby payload now includes a typed `cosmetics` snapshot per player.
- `Sidebar` renders equipped avatar/frame without extra client fetches; the existing layout stays unchanged.
- Frame visuals use a sanitized resolver (`src/lib/cosmetics/frame.ts`) so template colors stay whitelist/hex-safe.
- Socket join now verifies user identity from the session cookie instead of trusting client-sent `authUserId`.
- Added smoke coverage: `npm run test:frame-theme`.

## 9 March 2026 Update - Card Back in Transition

- `TransitionScreen` now accepts an optional `cardBackTheme`.
- Equipped `card_back` cosmetics render only for authenticated users and only on their own transition screen.
- Guest users keep the default transition UI with no cosmetic fetch.
- Added smoke coverage: `npm run test:card-back`.
