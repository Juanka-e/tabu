# Kalan Isler

> Son guncelleme: 28 July 2026
> Durum: aktif uygulanabilir backlog

## Su Anki Oncelik Sirasi
1. `test/room-capacity-final-validation`
2. `feature/cache-and-rate-limit-foundation`
3. `feature/post-launch-economy-observability-review`
4. `feature/audit-retention-and-telemetry-foundation`
5. `feature/admin-promotions-ux`
6. `feature/cosmetic-render-upgrade`
7. `feature/admin-cosmetic-authoring`
8. `feature/analytics-event-foundation`
9. `feature/word-analytics-liveops`
10. `feature/post-launch-xp-level-foundation`
11. `feature/post-launch-missions-foundation`
12. `feature/post-launch-night-market-foundation`
13. `feature/mobile-api-foundation`
14. `feature/release-ops-docs`
15. `docs/encoding-cleanup`
16. `feature/wallet-ledger-foundation`

## Aktif Branch

### `test/room-capacity-final-validation`

Tamamlananlar:
- paralel join sirasinda ikinci atomik room-cap kontrolu
- takim secimi ile room state'e ekleme arasindaki await boslugunun kaldirilmasi
- 24 adaydan 12 kabul / 12 red davranisini dogrulayan socket load scripti
- full-room guest reconnect ve persistent `playerId` dogrulamasi
- overflow sonrasi public lobby payload veri minimizasyonu dogrulamasi
- 10 ardisik turda 42-70 ms local paralel join correctness baseline
- gecici kayitli hesapla 3 oyuncu red / 4 oyuncu uygun server guard testi
- `closed` admission altinda create/join red ve mevcut guest reconnect testi
- test sonrasi system settings, audit ve gecici kullanici DB restorasyonu
- Next route ve Socket.IO runtime icin process-global settings cache invalidation
- Next admin route ve Socket.IO runtime icin process-global canli room metrics provider
- mevcut oyunculari atmadan room/team limit dusurme ve tekrar yukseltme testi
- warning, critical ve closed admin capacity health API karar testi
- gercek mac akisi ile late spectator finalize red, sifir coin ve denied audit testi

Acik kalanlar:
- admin health kartinin masaustu ve mobilde son gorsel smoke turu

Referans:
- `docs/guides/room-rules-and-capacity-controls-guide.md`
- `docs/guides/room-capacity-load-validation-checklist.md`

## Onceki Branch Kaydi
### `feature/admin-match-history-review`
Tamamlananlar:
- kullanici listesinden lazy acilan, sayfalanmis mac gecmisi
- skor, takim, sonuc, coin, kadro dagilimi ve oyun modu gorunumu
- yeni maclar icin server-owned bitis, sure, format ve hedef snapshot'i
- hot/archive finalize audit metadata ile guard ve lineup zenginlestirmesi
- audit snapshot yoksa bilinmeyen veriyi uydurmayan fallback
- gercek MySQL hot -> archive entegrasyon testi

Acik kalanlar:
- anlatici rotasyon gecmisi bugun room state'te kalici tutulmuyor
- rotasyon ihtiyaci ayri game telemetry/snapshot tasariminda ele alinacak

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
- yeni bir `apps/api` runtime'i; mobil veya bagimsiz API ihtiyaci dogana kadar acilmayacak

## Yakin Sonraki Branch'ler

### `feature/admin-match-history-review` - tamamlandi
- admin kullanici inceleme akisina mac gecmisi yuzeyi
- mac suresi, skor tipi, takim dagilimi, anlatici rotasyonu ve ekonomi etkisi gorunurlugu
- audit ile mac detayi arasinda daha adil moderasyon gecisi
- anlatici rotasyonu icin veri uydurulmadi; kalici event/snapshot modeli sonraya
  birakildi

### `feature/admin-categories-dnd-polish` - tamamlandi
- gercek mouse drag ve mobil ok kontrolu Playwright ile dogrulandi
- hata rollback'i, server canonical order dogrulamasi, cache invalidation ve audit eklendi
- kategoriler sayfasi UTF-8, responsive ve erisilebilirlik bakimindan temizlendi

### `feature/room-rules-and-capacity-controls`
- aktif branch; yukaridaki kapsam uygulanmis durumda
- oda sifresi bu branch'e alinmadi; gerekirse ayri ve sade bir akis olacak
- manuel izleyici modu launch kapsaminda degil; altyapi rolu ve reward dislama hazir
- minimum katilim yuzdesi launch kapsaminda degil; saha verisi olmadan eklenmeyecek

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
- mevcut modularizasyon fazi tamamlandi: web runtime `apps/web`, paylasilan DB/cache
  katmani `packages/platform-*`, one-shot isler `apps/jobs` altinda calisiyor.
- `apps/api` bilincli olarak bos tutulmuyor; bagimsiz deploy veya mobil kontrat ihtiyaci
  gercek oldugunda acilacak.
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
