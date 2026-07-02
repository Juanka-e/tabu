# Prisma Build Hardening

Bu not aktif bir production bug degil, ama build log'larini kirleten ve ileride gercek hatalari maskeleyebilecek bir hardening isidir.

Semptom:

- `next build` sirasinda cok kez `prisma.systemSetting.findMany()` uyarisi goruluyor
- build tamamen dusmuyor
- uygulama varsayilan ayarlara fallback ederek devam ediyor

Kaynak:

- `src/lib/system-settings/service.ts` icindeki `getSystemSettings()`
- build-time metadata veya layout cagrilari
- ozellikle:
  - `src/app/layout.tsx`
  - `src/app/room/[code]/layout.tsx`
  - `src/app/login/layout.tsx`
  - `src/app/register/layout.tsx`
  - `src/app/store/page.tsx`

Muhtemel neden:

- build ortaminda Prisma datasource tam uygulama runtime'i ile ayni degil
- `getSystemSettings()` build sirasinda DB'ye erismeye calisiyor
- mevcut fallback sadece belirli database erisim hatalarini yumusatiyor
- log'daki `the URL must start with the protocol prisma:// or prisma+postgres://` mesaji ayri bir hata sinifi oldugundan sessizce onlenmiyor

Neden ayri gorev:

- bu konu Redis rollout'tan ayri
- burada alinacak karar SEO / metadata / build cache davranisini etkileyebilir
- yanlis bir "hemen sustur" cozumuyla runtime hata gorunurlugu zarar gorebilir

Onerilen cozum yollari:

1. build-time metadata icin DB bagimli branding okumayi azalt
2. `getSystemSettings()` icinde build ortamina ozel kontrollu fallback stratejisi tanimla
3. branding gibi nadir degisen ayarlari build-safe snapshot veya env tabanli kaynakla ayir
4. log seviyesini dusurmeden, tanimli hata siniflari icin tek seferlik warning davranisi ekle

Karar verilmesi gereken nokta:

- metadata ve layout katmanlari build sirasinda DB'den mi beslenecek
- yoksa branding/runtime ayarlari ayrilip build-safe bir kaynak mi kullanilacak
