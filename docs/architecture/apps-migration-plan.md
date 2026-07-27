# Apps Migration Plan

> Status: accepted planning note
> Last updated: 26 July 2026

## Goal

Repo'yu bir anda microservice'e bolmeden, kontrollu sekilde `apps/` + `packages/` yonune tasimak.

Bu planin hedefi:

- mevcut oyunu ve admin panelini kirip dagitmamak
- mobil uygulama ihtimalini bugunden dogru sinirlara oturtmak
- realtime, API ve jobs yuklerini zamanla ayri runtime'lara ayirabilmek
- Docker/local development akisini veri kaybi yaratmadan sade tutmak

## Non-Goals

Su anda yapmiyoruz:

- hemen `src/` altindaki tum kodu tasimak
- hemen ayri `apps/api` servisi yayina almak
- DB motorunu MySQL'den PostgreSQL'e cevirmek
- microservice, message broker veya distributed saga tasarimina gecmek

## Current Truth

Bugunku sistem:

- tek repo
- tek Next.js uygulamasi
- custom Socket.IO server
- Prisma + MySQL source of truth
- Redis client, fallback, rate limit ve oda coordination temeli hazir
- economy counter, cache ve Socket.IO adapter katmanlari henuz sonraki fazlarda

Bu nedenle dogru yon `modular monolith first`tir.

## Target Shape

```text
apps/
  web/      -> oyuncu web + admin panel + UI'ya yakin BFF route'lari
  api/      -> mobil/public/backend API runtime
  jobs/     -> retention, archive, telemetry, cleanup, batch workflows

packages/
  domain-game/
  domain-economy/
  domain-player/
  platform-db/
  platform-cache/
  platform-auth/
  shared-config/
  shared-types/
```

`packages/` isimleri ileride daralabilir veya birlesebilir.
Buradaki amac once sorumluluk sinirini netlestirmektir.

## Why This Order

Dogru gecis sirasi:

1. hedef klasorleri tanimla
2. paylasilan kodu `packages/` altina cikar
3. import ve config bagimliliklarini merkezilestir
4. ancak bundan sonra runtime tasimasi yap

Tersini yapmak erken kirilim ve import karmasasi uretir.

## Phase Plan

### Phase 0 - Scaffold And Rules

Durum: tamamlandi.

Bu fazin ciktilari:

- `apps/` klasoru
- `packages/` hedef siniri
- root npm workspace kontrati
- ADR
- migration plan dokumani
- local infra helper script'leri
- named volume ile veri kaliciligi notlari
- Redis health/retry/key prefix ve Docker connection smoke testi

Bu fazda fiziksel runtime ayrimi yoktur.

### Phase 1 - Package Boundaries

Durum: devam ediyor.

Tamamlanan platform sinirlari:

- `packages/platform-db`
- `packages/platform-cache`
- Next.js transpile ve Docker `npm ci` workspace destegi
- direct infrastructure importlarini engelleyen boundary smoke testi

Ilk teknik ayirma kod tasimasi degil, sorumluluk ayirmasidir.

Oncelikli adaylar:

- `packages/platform-db`
  - Prisma client
  - DB helper'lari
  - transaction giris noktalari

- `packages/platform-cache`
  - Redis/Valkey abstraction
  - memory fallback
  - counter/cache contract'lari

- `packages/platform-auth`
  - session lookup
  - auth helper'lari
  - role gate util'leri

- `packages/domain-player`
  - profile/display name/avatar/frame mantigi
  - room identity projection helper'lari

- `packages/domain-economy`
  - reward eligibility
  - reward source kurallari
  - abuse guard hesaplari

- `packages/domain-game`
  - room/game state pure logic
  - turn/score helper'lari

Phase 1 kurali:
- UI component'leri dogrudan runtime'a yakin kalabilir
- once logic ve platform katmani ayrilir

### Phase 2 - `apps/web` Move

Bu fazda mevcut Next.js uygulamasi `apps/web` altina tasinabilir.

Ancak su sartlar tamamlanmadan baslanmamali:

- Prisma ve cache import'lari merkezi hale gelmis olmali
- `server.ts` ve socket bootstrap akisi net karar altina alinmali
- root-level script ve path bagimliliklari cikarilmis olmali

Bu tasimadan sonra root repo:

- workspace orchestration
- Docker
- shared config
- packages

rolune gelir.

### Phase 3 - `apps/jobs`

Ayri jobs runtime'i ilk gercek operasyonel faydayi burada verir.

Buraya alinabilecekler:

- audit retention / archive
- telemetry rollup
- notification cleanup
- catalog/background sync
- economy review aggregation

Bu faz, web request runtime'ini agir batch islerinden ayirir.

### Phase 4 - `apps/api`

`apps/api` hemen acilmamali.

Ancak su durumlarda gercek runtime'a donusturulmeli:

- mobil uygulama backlog'dan implementasyona gectiginde
- web ve mobil farkli release cadence istediginde
- public/backend contract'lari UI'dan bagimsizlasmaya basladiginda

Bu runtime'in ana rolu:

- mobile-safe API contract
- admin disi backend gateway logic
- BFF disi entegrasyon girisleri

### Phase 5 - Shared Coordination

Multi-instance veya yuksek online esiginde:

- Redis/Valkey counter
- shared presence
- Socket.IO adapter
- rate limit store
- dashboard summary cache

bu faza alinacak.

Burada da kural degismez:

- truth MySQL
- speed/coordinator Redis

## Docker And Local Development Plan

### Current Decision

Local gelistirme iki sekilde calisabilmeli:

1. infra-only Docker + app host machine
2. full Docker compose

Bu yuzden mevcut scriptler korunur:

- `npm run infra:up`
- `npm run infra:down`
- `npm run infra:logs`
- `npm run dev`

### Persistence Rule

MySQL ve Redis volume'leri named volume uzerinden kalici kalir.

Beklenen davranis:

- `docker compose down` -> veri silinmez
- container restart -> veri silinmez
- machine restart -> volume duruyorsa veri silinmez
- yalniz `down -v` veya manuel volume delete -> veri silinir

Bu davranis local resetlerde gereksiz veri kaybini engeller.

### Why MySQL Stays

Bu migration sirasinda DB motoru degistirmek teknik riski gereksiz buyutur.

Su an yapilacak sey:

- MySQL'i source of truth olarak korumak
- Prisma schema ve deploy aliskanligini stabil tutmak
- runtime ayrimini DB migration'indan ayri ele almak

### Future Docker Shape

Kisa vadede:

- tek app container kabul
- mysql
- redis
- nginx

Orta vadede:

- `web`
- `jobs`
- mysql
- redis
- nginx

Mobil/API ihtiyaci gercek oldugunda:

- `web`
- `api`
- `jobs`
- mysql
- redis
- nginx

Bu siralama operasyon yukunu kontrollu buyutur.

## Branch Plan

Onerilen implementasyon sirasi:

1. `feature/apps-workspace-foundation`
- workspace root duzenleri
- `apps/` ve gerekirse `packages/` scaffolding
- tsconfig/path planinin hazirlanmasi

2. `feature/packages-extraction-foundation`
- platform ve domain paketlerinin ilk tasinmasi

3. `feature/docker-local-dev-foundation`
- local compose/dev ergonomisi
- volume/persistence docs
- env orneklerinin sadelestirilmesi

4. `feature/cache-and-rate-limit-foundation`
- Redis abstraction
- memory fallback
- shared coordination hazirligi

5. `feature/jobs-runtime-foundation`
- audit retention/archive
- telemetry jobs

6. `feature/mobile-api-foundation`
- ancak mobil backlog'u gercek implementasyona girdiginde

## Guardrails

Gecis boyunca korunacak kurallar:

- tek branch tek konu
- runtime ayirmadan once package ayirimi
- MySQL source of truth'u bozmama
- Redis'i persistent truth gibi kullanmama
- local developer flow'u zorlastirmama

## Success Criteria

Bu plan basarili sayilirsa:

- yeni mod veya yeni web yuzeyi eklenirken root app daha az sisir
- mobil API cikarmak buyuk refactor gerektirmez
- jobs yukleri web runtime'ini kirletmez
- local developer `infra:up + dev` ile veri kaybetmeden calisir
