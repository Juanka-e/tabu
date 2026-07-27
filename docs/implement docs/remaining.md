# Kalan Isler

> Son guncelleme: 27 July 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `chore/dependency-security-refresh`
2. `feature/admin-match-history-review`
3. `feature/admin-categories-dnd-polish`
4. `feature/room-rules-and-capacity-controls`
5. `feature/post-launch-economy-observability-review`
6. `feature/cache-and-rate-limit-foundation`
7. `feature/audit-retention-and-telemetry-foundation`
8. `feature/jobs-runtime-foundation`
9. `feature/admin-promotions-ux`
10. `feature/cosmetic-render-upgrade`
11. `feature/admin-cosmetic-authoring`
12. `feature/analytics-event-foundation`
13. `feature/word-analytics-liveops`
14. `feature/post-launch-xp-level-foundation`
15. `feature/post-launch-missions-foundation`
16. `feature/post-launch-night-market-foundation`
17. `feature/mobile-api-foundation`
18. `feature/release-ops-docs`
19. `docs/encoding-cleanup`
20. `feature/wallet-ledger-foundation`

## Aktif Branch

### `chore/dependency-security-refresh`

Tamamlananlar:
- Auth.js kritik advisory'lerinin guvenli beta patch ile kapatilmasi
- Next.js, PostCSS, Playwright ve ESLint Next patch guncellemeleri
- Socket.IO transitif engine / adapter / ws guvenlik patch'leri
- kullanilmayan `multer`, `dompurify` ve `isomorphic-dompurify` paketlerinin kaldirilmasi
- production audit sonucunun 17 bulgudan 4 bulguya dusurulmesi
- auth, upload, sanitizer, websocket, Playwright ve production build regresyonlari

Acik kalanlar:
- Next'in bundled PostCSS ve destekledigi Sharp araligi icin upstream patch beklemek
- yeni stabil Next surumlerinde residual advisory zincirini yeniden degerlendirmek

## Onceki Branch Kaydi
### `feature/packages-extraction-foundation`
Tamamlananlar:
- `@hushle/platform-db` ve `@hushle/platform-cache`
- compatibility re-export'lari
- Next.js, Docker ve boundary test entegrasyonu
- platform package ADR ve migration dokumantasyonu

### `feature/gameplay-ui-polish`
Tamamlananlar:
- kayitli kullanici icin `displayName -> username` fallback akisi
- settings ve lobby quick edit arasinda canli isim senkronu
- bos `displayName` temizlendiginde kayitli kullanicida hesap adina donus
- guest isim akisinin lobby bazli kalmasi
- oyun basladiktan sonra isim duzenlemeyi kilitleme
- audit lineup identity snapshot yapisi
- audit tarafinda guest / kayitli kimlik ayrimi
- room ust bari ve mobil yardimci menu sadelestirmesi
- pause sirasinda sag ust modallari erisilebilir kilma
- lobby branding logosunu system settings ile dinamik kullanma
- hazirlik ekraninin sadelestirilmesi ve ilk gecis mesajlarinin duzeltilmesi
- dashboard profil alaninda avatar + frame gorunumunun toparlanmasi
- stale `tabu_activeRoomCode` yuzunden olusan yanlis `lobidesin` blokajinin kaldirilmasi
- bildirim sheet basliginin ve close aksiyonunun yeniden duzenlenmesi
- hizli kusan alaninin tekrar tek satira cekilmesi
- kayitli kullanici icin server-side aktif oda kontrolu
- process-local `userId -> roomCode` room index optimizasyonu
- envanterde kusanilan kozmetigi dogrudan cikarabilme
- room / lobby logosunun ust merkezde daha dengeli konumlanmasi
- `apps/` yonelimi, Docker veri kaliciligi ve modularizasyon plani dokumantasyonu
- npm workspace sinirlarinin `apps/*` ve `packages/*` icin acilmasi
- Redis retry, health, graceful shutdown ve ortam bazli key prefix altyapisi
- Redis destekli rate limit, room membership, action lock ve admin handoff koordinasyonu
- MySQL 8.4 ve izole local Redis portlariyla kalici Docker gelistirme altyapisi

Acik kalanlar:
- admin kategoriler surukle-birak davranisini gercek kullanimda son kez dogrulama
- bildirim sheet, toast, header ve hizli kusan iyilestirmelerini gercek cihazlarda son bir tur kontrol etmek
- aktif oda korumasini coklu sekme / reconnect senaryolarinda son bir tur dogrulamak
- `docs/guides/gameplay-ui-polish-smoke-checklist.md` uzerinden gercek cihaz smoke turu yapmak
- Socket.IO event fan-out icin Redis adapter ihtiyacini multi-instance asamasinda ele almak
- kart kozmetik art direction konusu arastirma bekliyor; premium tasarim yonu netlesene kadar sistem tarafi not seviyesinde tutulacak

Bilincli olarak bu branch'te yapmiyoruz:
- admin detayli mac gecmisi yuzeyi
- room sifre sistemi
- oda kapasitesi ve oyuncu sirasi kural paneli
- XP / gorev / event runtime
- fiziksel `apps/web` veya `apps/api` kod tasimasi

## Yakin Sonraki Branch'ler

### `feature/admin-match-history-review`
- admin kullanici inceleme akisina mac gecmisi yuzeyi
- mac suresi, skor tipi, takim dagilimi, anlatici rotasyonu ve ekonomi etkisi gorunurlugu
- audit ile mac detayi arasinda daha adil moderasyon gecisi

### `feature/admin-categories-dnd-polish`
- kategori surukle-birak akisini dogrulama
- reorder sonrasi geri bildirim / hata durumlari
- kategoriler sayfasindaki UTF-8 ve copy temizligi
- mobil / dusuk hassasiyetli pointer davranisini iyilestirme

### `feature/room-rules-and-capacity-controls`
- oda kapasitesi icin net ust sinir karari
- dengesiz takim senaryolari icin yonetici davranisi
- gerekirse bounded oyuncu sirasi / anlatici sirasi kontrolu
- oda sifresi eklenirse ayri, sade bir akisla ele alma

### `feature/cache-and-rate-limit-foundation`
- mevcut Redis abstraction'i uzerinde atomik counter/lock sertlestirmesi
- development memory fallback davranisini fault testlerle genisletme
- production shared cache ve rate limit store gozlemlenebilirligi
- dashboard summary short TTL cache
- store catalog cache
- notification unread counter
- economy guard rolling counters
- repeated-group keyed counters
- Socket.IO Redis adapter ile multi-instance event fan-out
- Redis destekli registered `userId -> roomCode` shared presence index'i load test etme
- referans: `docs/cache-and-storage-strategy.md`

### `feature/audit-retention-and-telemetry-foundation`
- hot audit ve archive audit ayrimi
- scheduled retention / archive job
- signal-first audit siniflandirmasi
- non-triggered high-volume event'leri telemetry hattina tasima
- economy finalize audit hacmini kontrollu hale getirme
- admin review icin archive read path veya archive arama yuzeyi

### `feature/jobs-runtime-foundation`
- retention, archive ve telemetry islerini ayri runtime'a hazirlamak
- web request runtime disina alinabilecek batch isleri ayirmak
- ileride `apps/jobs` icine tasinacak is kontratlarini netlestirmek

### `feature/mobile-api-foundation`
- ancak mobil backlog'u gercek implementasyona girdiginde acilacak
- `apps/api` icin ilk API kontratlari
- auth, profile, inventory ve progression gibi mobil dostu read/write surface'ler

### `feature/cosmetic-render-upgrade`
- magaza grid'inde thumbnail-first preview stratejisi
- buyuk preview ile grid preview'ini ayirma
- gerekirse `previewImageUrl` / `thumbnailUrl` alanlarini kataloga ekleme
- kart / cerceve / avatar mini preview maliyetini dusurme
- lazy loading, pagination veya virtualization ihtiyacini veri hacmine gore uygulama

### `feature/post-launch-economy-observability-review`
- canlidan sonra gercek coin kazanimi gozlemi
- magaza satin alma hizi
- retention ve pacing ayarlari
- economy guard tetiklerinin saha verisiyle yeniden tuning edilmesi

## Uzun Vadeli Notlar
- modularizasyon plani icin referans: `docs/architecture/adr-001-apps-workspace-and-runtime-split.md`
- detayli migration fazlari: `docs/architecture/apps-migration-plan.md`
- Redis geldiginde source of truth yine MySQL olacak; Redis yalniz cache / counter / coordination katmani olacak.
- bugunku registered room index tek-instance icin process-local yeterlidir; multi-instance asamasinda shared presence katmanina tasinmalidir.
- non-triggered finalize kayitlari ileride daha hafif telemetry yoluna tasinabilir.
- eski `game.match.finalize` kayitlari icin retention / archive plani gerekli.
- admin kullanici mesajlasma sistemi ayri bir operasyon branch'i olarak dusunulmeli.
- kart kozmetikleri icin profesyonel yon `image/hybrid first`, `template second` olarak korunmali; gorsel research tamamlanmadan render sistemi acele buyutulmemeli.

## Referans Rehberler
- `docs/guides/economy-abuse-hardening-guide.md`
- `docs/guides/economy-progression-and-pricing-guide.md`
- `docs/guides/player-display-name-and-audit-strategy-guide.md`
- `docs/cache-and-storage-strategy.md`
- `docs/architecture/apps-migration-plan.md`
