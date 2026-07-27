# Kalan Isler

> Son guncelleme: 27 July 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `feature/admin-match-history-review`
2. `feature/admin-categories-dnd-polish`
3. `feature/room-rules-and-capacity-controls`
4. `feature/post-launch-economy-observability-review`
5. `feature/cache-and-rate-limit-foundation`
6. `feature/audit-retention-and-telemetry-foundation`
7. `feature/admin-promotions-ux`
8. `feature/cosmetic-render-upgrade`
9. `feature/admin-cosmetic-authoring`
10. `feature/analytics-event-foundation`
11. `feature/word-analytics-liveops`
12. `feature/post-launch-xp-level-foundation`
13. `feature/post-launch-missions-foundation`
14. `feature/post-launch-night-market-foundation`
15. `feature/mobile-api-foundation`
16. `feature/release-ops-docs`
17. `docs/encoding-cleanup`
18. `feature/wallet-ledger-foundation`

## Aktif Branch

### `feature/audit-archive-read-path`

Tamamlananlar:
- hot ve archive audit icin ayri, sayfalanmis admin gorunumleri
- retention aninda actor username snapshot'i
- archive kaynaginda arama, action, resource, rol ve economy guard filtreleri
- archive zamani ve kaynak ayrimi
- gercek MySQL retention + archive read-path entegrasyon testi

Acik kalanlar:
- production retention schedule icin operasyonel kabul ve zamanlama
- telemetry siniflandirmasi ve archive purge politikasi ayri branch'lerdir

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
- admin review icin archive read path - tamamlandi

### `feature/jobs-runtime-foundation` - tamamlandi
- `apps/jobs` one-shot runtime ve audit archive job'u eklendi
- mutating calisma explicit gate ve Redis lease gerektiriyor
- archive purge, telemetry rollup ve admin archive read path ayri tutuldu
- admin archive read path sonraki dar branch'te tamamlandi
- production retention schedule yine explicit operasyon karariyla acilacak

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
- siradan `game.match.finalize` kayitlarini signal-first telemetry hattina ayirma
  isi retention'dan ayri ele alinmali.
- admin kullanici mesajlasma sistemi ayri bir operasyon branch'i olarak dusunulmeli.
- kart kozmetikleri icin profesyonel yon `image/hybrid first`, `template second` olarak korunmali; gorsel research tamamlanmadan render sistemi acele buyutulmemeli.

## Referans Rehberler
- `docs/guides/economy-abuse-hardening-guide.md`
- `docs/guides/economy-progression-and-pricing-guide.md`
- `docs/guides/player-display-name-and-audit-strategy-guide.md`
- `docs/cache-and-storage-strategy.md`
- `docs/architecture/apps-migration-plan.md`
