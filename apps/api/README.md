# `apps/api`

Mobil uygulama ve gelecekteki bağımsız backend/API yüzeyi için sürümlü HTTP
runtime'ı.

## Bugünkü Kapsam

- bağımsız Node HTTP process'i
- `GET /health`
- `GET /v1/meta`
- `GET /v1/inventory`
- `PATCH /v1/inventory/equipped`
- `GET /v1/store/catalog`
- ortak success/error JSON zarfı
- `X-Request-Id` ve `X-Api-Version`
- exact browser CORS allowlist
- origin göndermeyen native/server istemciler için transport desteği
- opsiyonel Docker `api` profili

Runtime opaque bearer/refresh kimlik doğrulamasını sunar. Profile ve inventory
route'lari ortak business service'leri kullanir. Economy route'lari ayni
ayristirma yapilmadan acilmaz.

## Local Çalıştırma

Host makinede:

```bash
npm run api:dev
```

Varsayılan adres: `http://127.0.0.1:3001`.

Docker ile:

```bash
docker compose --profile api up -d api
```

Docker portu yalnız `127.0.0.1` üzerinde publish edilir. Nginx bu branch'te API
runtime'ına public route açmaz.

## Sınırlar

`apps/api`:

- `apps/web` veya Next.js import etmez
- browser cookie session'ını API auth kontratı olarak kullanmaz
- admin BFF route'larını barındırmaz
- process-local room/socket state'ini okumaz
- kalıcı veride MySQL, geçici koordinasyonda Redis kararını korur

Paylaşılan transport kontratları `@hushle/api-contracts` paketindedir.

## Taşıma Sırası

1. bearer access/refresh auth ve token rotation - tamamlandı
2. `/v1/me` ve profile read/write - tamamlandı
3. inventory read ve equip - tamamlandı
4. store catalog read - tamamlandi
5. server-side fiyatlama ve wallet ledger ile satin alma
6. notifications ve support
7. shared presence hazır olduğunda active-room/read modelleri

Admin route'ları web BFF'de kalır. Match finalize, room state bağımsız ve
owner-aware hale gelmeden realtime writer runtime'ından taşınmaz.
