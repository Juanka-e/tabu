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

