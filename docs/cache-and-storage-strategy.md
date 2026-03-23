# Cache And Storage Strategy

> Status: working architecture note
> Last updated: 23 March 2026

## Goal
- Keep MySQL as the source of truth.
- Use Redis or Valkey only for fast, disposable, coordination-oriented data.
- Avoid mixing persistent business records with cache or realtime state.

## Core Rule
- If losing the data would break accounting, audit, support history, or user ownership, it belongs in MySQL.
- If losing the data should only cause a cache miss, a retry, or a temporary performance drop, it can live in Redis/Valkey.

## MySQL Responsibilities
- users
- sessions and identity-linked records
- email fields and verification timestamps
- moderation records
- audit logs
- support tickets and support messages
- notifications
- wallet balances
- wallet adjustments
- purchases
- promotions, discount campaigns, coupons
- coin grant campaigns, codes, claims
- system settings persisted state
- future progression records
- future payment orders / ledger / settlements

## Redis Or Valkey Responsibilities
- system settings cache
- rate limiting counters
- notification unread counters or short-lived notification cache
- support queue counters
- captcha / abuse / gateway transient counters
- short TTL locks
- cache invalidation fan-out
- future websocket adapter state
- future room presence / ephemeral coordination state

## What Must Not Move Out Of MySQL
- wallet source of truth
- purchase history
- coin grant claims
- support message history
- audit logs
- system settings persisted values
- any record needed for reconciliation, refunds, moderation, or legal traceability

## System Settings Strategy
- Persist settings in MySQL `system_settings`.
- Read through a cache layer.
- Development can use in-process memory cache.
- Production should move to Redis/Valkey-backed cache when multi-instance deployment starts.
- Cache invalidation should happen on admin update.

## Rate Limit Strategy
- Development can use memory-backed rate limiting.
- Production should use Redis/Valkey-backed counters so limits are shared across all instances.
- Priority routes:
  - auth login
  - auth register
  - support message write
  - coin redeem
  - admin mutation routes
  - system settings update

## Room And Lobby Strategy
- Current room/lobby realtime state is held in memory inside the Socket.IO server.
- This is acceptable for local development and single-process deployment.
- It is not sufficient for PM2 multi-instance production by itself.

## PM2 Multi-Instance Implication
- If the app runs with `pm2 max`, two users of the same room can land on different Node processes.
- Without shared realtime coordination, each process sees a different in-memory room map.
- That would break:
  - room membership consistency
  - lobby updates
  - host/admin transfer logic
  - reconnect flows
  - timers

## Safe Production Options For Realtime
### Option A: single realtime process
- Keep one dedicated Socket.IO process for realtime room state.
- Scale the web app separately.
- Simpler operationally.

### Option B: Redis adapter + shared coordination
- Use Socket.IO Redis adapter or equivalent Redis-compatible adapter.
- Move ephemeral room coordination signals into Redis-backed infrastructure.
- More scalable, but more complex.

## Recommended Realtime Direction
- Early production:
  - single realtime process is acceptable
  - web app can scale more independently
- When concurrent room load grows:
  - introduce Redis/Valkey adapter and shared ephemeral coordination

## Development Strategy
- Local machine can run Redis or Valkey safely before server deployment.
- Development should still support fallback without Redis when practical.
- Preferred model:
  - dev without Redis: memory fallback works
  - dev with Redis/Valkey: used for realistic integration testing
  - prod: managed or self-hosted Redis/Valkey

## Redis Or Valkey Choice
- Use a Redis-compatible abstraction in code.
- That allows:
  - local Redis
  - local Valkey
  - managed Redis
  - managed Valkey-compatible providers
- The application should not hardcode vendor-specific assumptions in the first foundation slice.

## Planned Branch Order
1. `fix/system-settings-hardening`
2. `feature/branding-assets-upload`
3. `feature/cache-and-rate-limit-foundation`

## `fix/system-settings-hardening`
- add write rate limit to admin system settings update
- stop automatic external image preview loading in branding preview
- keep preview automatic only for trusted local/uploaded asset paths

## `feature/branding-assets-upload`
- logo upload
- favicon upload
- OG image upload
- file validation
- storage path strategy
- admin media picker UX

## `feature/cache-and-rate-limit-foundation`
- Redis/Valkey abstraction
- dev memory fallback
- prod Redis/Valkey cache store
- shared rate limit storage
- system settings cache invalidation
- reusable cache helpers for future notification/support features

## Decision Summary
- MySQL stores truth.
- Redis/Valkey stores speed.
- Realtime room state cannot stay purely process-local once PM2 multi-instance starts.
- Redis/Valkey should be introduced as a shared infrastructure foundation, not as a one-off patch for a single feature.
