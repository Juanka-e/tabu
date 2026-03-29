# Cache And Storage Strategy

> Status: working architecture note
> Last updated: 24 March 2026

## Goal
- Keep MySQL as the source of truth.
- Use Redis or Valkey only for fast, disposable, coordination-oriented data.
- Avoid mixing persistent business records with cache or realtime state.
- Define a repeatable rule for future features so every new module does not invent its own cache/storage behavior.

## Core Rule
- If losing the data would break accounting, audit, support history, user ownership, or legal traceability, it belongs in MySQL.
- If losing the data should only cause a cache miss, a retry, a recomputation, or a temporary performance drop, it can live in Redis/Valkey.

## Source-Of-Truth Rule
- MySQL answers: "what is true?"
- Redis/Valkey answers: "what is fast right now?"

Redis/Valkey must never become the only place where the business truth exists.

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
- idempotency helpers
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

## Decision Framework For Future Features
When a new feature is added, use this order:

1. Does the record need to survive a Redis flush or process restart?
- yes -> MySQL
- no -> continue

2. Would data loss create user-visible ownership/accounting inconsistency?
- yes -> MySQL
- no -> continue

3. Is the value derived from MySQL and cheap enough to recompute?
- yes -> cache is optional
- no -> Redis/Valkey cache is a good candidate

4. Is the data coordination-oriented across multiple Node processes?
- yes -> Redis/Valkey
- no -> process memory may still be acceptable in development

## Feature Decision Examples

### Good Redis/Valkey Candidates
- login/register brute-force counters
- support reply cooldown counters
- coin redeem abuse counters
- system settings cache
- notification unread count cache
- short-lived room join locks
- websocket fan-out/pub-sub

### Good MySQL Candidates
- support ticket message bodies
- wallet balances and wallet adjustments
- purchase/order history
- notification records themselves
- coin grant claim history
- audit events

### Maybe / Case-By-Case
- unread counts
  - truth in MySQL
  - cached count in Redis/Valkey
- current room snapshot
  - persistent match summary in MySQL if needed
  - active ephemeral room coordination in Redis/Valkey

## Development Strategy
- Local machine can run Redis or Valkey safely before server deployment.
- Development should still support fallback without Redis when practical.
- Preferred model:
  - dev without Redis: memory fallback works
  - dev with Redis/Valkey: used for realistic integration testing
  - prod: managed or self-hosted Redis/Valkey

This means local development is not blocked, but production architecture is still modeled correctly.

## PM2 Strategy

### What PM2 Solves
- uses multiple CPU cores
- keeps HTTP/API workload from being pinned to one Node process
- gives restart supervision
- improves resilience for standard request/response traffic

### What PM2 Does Not Solve By Itself
- shared cache
- shared rate limits
- shared websocket room state
- cross-process timers and ephemeral locks

If the app runs with `pm2 max`, two users of the same room can land on different Node processes.
Without shared realtime coordination, each process sees a different in-memory room map.

That breaks:
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
- Best early production choice if room concurrency is still moderate.

### Option B: Redis adapter + shared coordination
- Use Socket.IO Redis adapter or equivalent Redis-compatible adapter.
- Move ephemeral room coordination signals into Redis-backed infrastructure.
- More scalable, but more complex.
- Better once real concurrent room load and PM2 multi-instance become normal.

## Recommended Realtime Direction
- Early production:
  - single realtime process is acceptable
  - web app can scale more independently
- When concurrent room load grows:
  - introduce Redis/Valkey adapter
  - introduce shared ephemeral coordination
  - stop relying on process-local room truth

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

## Rollout Plan For `feature/cache-and-rate-limit-foundation`

### Phase 1
- introduce cache/rate-limit abstraction layer
- keep memory fallback for local development
- allow Redis/Valkey backend via env

### Phase 2
- move rate limit store behind shared adapter
- move system settings cache behind shared adapter
- add invalidation helpers

### Phase 3
- add notification/support counters
- add short TTL coordination helpers
- prepare websocket adapter integration

### Phase 4
- if PM2 multi-instance realtime becomes standard:
  - add Socket.IO Redis adapter
  - add room/lobby ephemeral coordination strategy

## Integration With Future Features
New features should not connect to Redis/Valkey by default.
They should connect only if one of these is true:

- they need cross-instance coordination
- they need shared rate limits
- they need short-lived cache for expensive reads
- they need ephemeral presence/session-like state
- they need pub/sub invalidation or fan-out

Otherwise:
- keep the truth in MySQL
- add Redis/Valkey only when the benefit is operationally real

## Current Recommended Branch Order
1. `feature/integration-hub`
2. `feature/dashboard-visual-polish`
3. `feature/cache-and-rate-limit-foundation`

## Decision Summary
- MySQL stores truth.
- Redis/Valkey stores speed and coordination.
- PM2 helps CPU/process scaling, not shared state correctness.
- Realtime room state cannot stay purely process-local once PM2 multi-instance starts.
- Redis/Valkey should be introduced as a shared infrastructure foundation, not as a one-off patch for a single feature.
