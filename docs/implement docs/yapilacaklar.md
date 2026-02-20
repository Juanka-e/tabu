# Yapılacaklar Listesi — TABU Oyun Platformu

> Son güncelleme: 18 Şubat 2026

---

## 🔴 Kritik Hatalar (Çözülenler)

### ✅ Admin Disconnect Timeout Hatası (15 Şubat 2026)
- **Kök Neden:** Admin disconnect olduğunda `getRoomBySocketId(socket.id)` kullanılıyordu. Timeout ateşlendiğinde socket zaten disconnected olduğu için oda bulunamıyordu.
- **Çözüm:** `room.odaKodu` closure'a yakalandı ve `getRoom(roomCode)` kullanıldı. Ayrıca `persistRoom` ve `broadcastLobby` çağrıları eklendi.
- **Dosya:** `src/lib/socket/game-socket.ts` (satır ~1135-1162)

### ✅ Register Route ZodError Hatası (15 Şubat 2026)
- **Kök Neden:** ZodError'da `errors` property kullanılıyordu ancak Zod'da bu `issues` olarak adlandırılır.
- **Çözüm:** `error.errors[0].message` → `error.issues[0].message` olarak düzeltildi.
- **Dosya:** `src/app/api/auth/register/route.ts` (satır ~44)

### ✅ Socket "Bu oda bulunamadı" Hatası
- **Kök Neden:** Ana sayfa oda oluşturduktan sonra `socket.disconnect()` çağırıyor → sunucu tarafında oda 0 oyuncu ile kalıyor → oda yıkılıyor → `/room/[code]` sayfası bağlandığında oda yok
- **Çözüm:** `game-socket.ts` dosyasındaki `disconnect` handler'ına 15 saniye bekleme süresi (grace period) eklendi. Oda artık hemen yıkılmıyor, yeni bağlantı gelmesini bekliyor.
- **Dosya:** `src/lib/socket/game-socket.ts` (satır ~1054)

### ✅ Admin 307 Redirect
- **Durum:** Normal davranış. NextAuth middleware, giriş yapmamış kullanıcıları `/admin/login`'e yönlendiriyor.
- **Login sayfası çalışıyor:** `admin/login/page.tsx` → kullanıcı adı ve şifre ile giriş yapılır
- **Veritabanındaki admin hesapları kullanılır** (bcrypt hash ile korunur)

---

## 🟡 Kısa Vadeli Görevler

### 1. Sunucuyu Doğru Başlatma
- [x] `npm run dev` ile sunucu başlatıldı ve http://localhost:3000 üzerinden erişildi.
- [x] Socket.IO bağlantısı test edildi ve çalışıyor.

### 2. Lobideki Buton Sorunları
- [x] Socket bağlantısı doğrulandı.
- [x] `npm run dev` kullanıldığında socket.io aktif.


### 3. Admin Girişi Test Et
- [x] Admin yönlendirmesi çalışıyor.
- [x] Admin şifresi `scripts/verify-admin.ts` ile sıfırlandı ve doğrulandı (`admin` / `admin123`).
- [x] `Admin` tablosu `User` tablosuna dönüştürüldü (Role-based auth).
- [x] Yeni kullanıcı oluşturma scripti: `npx tsx scripts/create-user.ts <user> <pass> <role>`

---

## 🟠 Orta Vadeli Görevler

### 4. Login Sayfası Tasarımı
- [x] `/login` ve `/register` sayfaları oluşturuldu.
- [x] Ana sayfaya (Lobi) Giriş/Kayıt butonları eklendi.
- [x] API endpoint (`api/auth/register`) eklendi.
- [ ] Ana sayfa (`page.tsx`) tasarımını React tasarıma göre güncelle
- [ ] Logo, arka plan efektleri, tema ayarları

### 5. Frontend-Socket Entegrasyon Testi
- [ ] Oda oluşturma → lobiye giriş → takım seçme → oyun başlatma → tüm akışı test et
- [ ] İki ayrı tarayıcı sekmesinde çok oyunculu test yap
- [ ] Her iki takımda en az 2'şer oyuncu olmalı (toplam min 4 kişi)
- [ ] Doğru/Tabu/Pas butonlarının çalışmasını kontrol et
- [ ] Zaman sayacı, tur geçişi, altın skor, oyun sonu ekranlarını test et

### 6. Modalleri Gerçek Veri ile Bağla
- [x] Kategori modalı → `/api/admin/categories` verisini çek
- [x] Duyuru modalı → `/api/announcements/visible` verisini çek
- [x] Kategori modalı responsive yapıldı (1/2/3 sütun)
- [x] Duyuru modalı responsive yapıldı
- [x] Kategori renk sistemi sabit renklere çevrildi (dark mode uyumluluğu için)

---

## 🟠 Orta Vadeli Görevler (Devam)

### 7. Admin Panel UI Özellikleri
- [x] Admin dashboard sidebar entegrasyonu (route group yapısı)
- [x] Rich text editor (Tiptap) — medya, link, formatlama desteği
- [x] Duyuru pinleme sistemi — sabit duyurular üstte
- [x] Duyuru medya desteği — görsel ve YouTube embed
- [x] Duyuru versiyon ve etiket alanları
- [x] Kategori drag-drop sıralama (sortOrder)
- [x] Kategori modalı responsive (accordion + grid)
- [x] Duyuru modalı responsive

### 8. Oyun Akışı Testi
- [ ] Oda oluşturma → lobiye giriş → takım seçme → oyun başlatma → tüm akışı test et
- [ ] İki ayrı tarayıcı sekmesinde çok oyunculu test yap
- [ ] Her iki takımda en az 2'şer oyuncu olmalı (toplam min 4 kişi)
- [ ] Doğru/Tabu/Pas butonlarının çalışmasını kontrol et
- [ ] Zaman sayacı, tur geçişi, altın skor, oyun sonu ekranlarını test et

---

## 🔵 Uzun Vadeli Görevler

### 9. Performans & İyileştirme
- [ ] Socket.IO reconnection stratejisi (bağlantı koptuğunda otomatik yeniden bağlanma)
- [x] Responsive test (mobil, tablet, masaüstü) — Modaller responsive yapıldı
- [ ] Full oyun akışı responsive test
- [ ] Tarayıcı uyumluluğu (Chrome, Firefox, Safari, Edge)

### 10. Çoklu Dil Desteği (i18n)
- [ ] Türkçe/İngilizce/İspanyolca arayüz
- [ ] `useTranslation` hook entegrasyonu

### 11. Deployment
- [ ] Production build testi (`npm run build`)
- [ ] Ortam değişkenleri ayarları
- [ ] Domain ve SSL konfigürasyonu
- [ ] `ALLOWED_ORIGINS` güvenlik ayarı

### 12. Ek Özellikler
- [ ] Oyun istatistikleri
- [ ] Ses efektleri
- [ ] Oyun geçmişi kaydı
- [ ] Oyuncu profilleri

---

## 📝 Proje Yapısı Özeti

```
newnextjs/
├── server.ts                    # Custom server (Socket.IO + Next.js)
├── src/
│   ├── app/
│   │   ├── page.tsx            # Ana sayfa (oda oluştur/katıl)
│   │   ├── room/[code]/page.tsx # Oyun sayfası (lobi → oyun → sonuç)
│   │   ├── admin/
│   │   │   ├── layout.tsx      # Admin layout (auth korumalı)
│   │   │   ├── login/page.tsx  # Admin giriş
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── words/page.tsx  # Kelime yönetimi
│   │   │   ├── categories/     # Kategori yönetimi
│   │   │   ├── announcements/  # Duyuru yönetimi
│   │   │   └── bulk-upload/    # Toplu CSV yükleme
│   │   └── api/admin/          # Admin API routes
│   ├── lib/
│   │   ├── auth.ts             # NextAuth konfigürasyonu
│   │   ├── prisma.ts           # Prisma client
│   │   └── socket/
│   │       ├── game-socket.ts  # Socket.IO oyun mantığı
│   │       ├── word-service.ts # Kelime havuzu servisi
│   │       └── category-service.ts
│   ├── components/             # UI bileşenleri
│   └── middleware.ts           # Admin route koruması
└── prisma/schema.prisma        # Veritabanı şeması
```

---

## ⚡ Hızlı Başlangıç

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Veritabanı şemasını senkronize et
npx prisma db push

# 3. Sunucuyu başlat (Socket.IO dahil)
npm run dev

# 4. Tarayıcıda aç
# Oyun: http://localhost:3000
# Admin: http://localhost:3000/admin
```
