# apps/web

Planlanan ana Next.js uygulamasi.

Bu hedef runtime sunlari tasir:

- oyuncu web deneyimi
- admin paneli
- auth akisi
- UI'ya yakin BFF route'lari

## Simdiki Durum

Kod halen repo kokunde:

- `src/app`
- `src/components`
- `src/lib`

## Tasima Kriteri

`apps/web` tasimasi ancak su kosullar tamamlandiginda baslamali:

1. `packages/` sinirlari tanimlanmis olmali
2. Prisma/Redis/config import yollari merkezilesmis olmali
3. custom server ve realtime akisi ayri karar altina alinmis olmali
