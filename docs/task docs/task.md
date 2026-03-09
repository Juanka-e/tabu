# Tabu Game: Next.js Migration & Multi-Game Platform

## Phase 1: Planning & Architecture
- [x] Explore vanilla JS Tabu project (backend, socket, DB, admin)
- [x] Explore React frontend design (components, types, services)
- [x] Create implementation plan
- [x] Get user approval on architecture

## Phase 2: Project Initialization
- [x] Initialize Next.js 16 project with TypeScript
- [x] Install and configure dependencies (shadcn/ui, Tailwind CSS, Prisma, socket.io, NextAuth)
- [x] Set up project folder structure (multi-game scalable architecture)
- [x] Configure tsconfig.json, next.config.ts, package.json

## Phase 3: Database & Prisma Setup
- [x] Design Prisma schema (Admin, Word, TabooWord, Category, WordCategory, Announcement)
- [ ] Run Prisma migration / db push
- [ ] Create seed script with existing data
- [ ] Test DB connection and migrations

## Phase 4: Authentication & Admin Panel
- [x] Set up NextAuth.js with credentials provider (admin login)
- [x] Build admin layout with sidebar navigation (`admin/layout.tsx`, `admin-sidebar.tsx`)
- [x] Admin login page (`admin/login/page.tsx`)
- [x] Admin dashboard page with stats (`admin/page.tsx`)
- [x] Dashboard API route (`api/admin/dashboard-stats/route.ts`)
- [x] Word management API routes (`api/admin/words/route.ts`, `api/admin/words/[id]/route.ts`)
- [x] Category management API routes (`api/admin/categories/route.ts`, `api/admin/categories/[id]/route.ts`)
- [x] Announcement management API routes (`api/admin/announcements/route.ts`, `api/admin/announcements/[id]/route.ts`)
- [x] Public announcements API (`api/announcements/visible/route.ts`)
- [x] Middleware for admin route protection (`middleware.ts`)
- [x] Admin words management UI page (`admin/words/page.tsx`)
- [x] Admin categories management UI page (`admin/categories/page.tsx`)
- [x] Admin announcements management UI page (`admin/announcements/page.tsx`)
- [x] Bulk CSV upload API and UI (`api/admin/words/bulk-upload/route.ts`, `admin/bulk-upload/page.tsx`)

## Phase 5: Game Frontend (Tabu)
- [x] Home page with username input and room creation/joining (`page.tsx`)
- [x] Room page with all game views: Lobby, Transition, Playing, Game Over (`room/[code]/page.tsx`)
- [x] Lobby component with settings, categories, teams (`lobby.tsx`)
- [x] Game card component with difficulty badges and category colors (`game-card.tsx`)
- [x] Sidebar component with team players and status (`sidebar.tsx`)
- [x] Announcements modal component (`announcements-modal.tsx`)
- [x] Rules modal component with full game guide (`rules-modal.tsx`)
- [x] Theme provider with dark/light mode support (`theme-provider.tsx`)
- [x] shadcn/ui components installed (Button, Card, Dialog, Input, etc.)
- [x] Header buttons (Announcements, Rules, Theme Toggle) in room page
- [x] Paused Overlay with blur effect and play/pause button

## Phase 6: Socket.IO Integration
- [x] Port game socket logic (gameSocket.js) to TypeScript — `game-socket.ts`
- [x] Port word service to Prisma-backed — `word-service.ts`
- [x] Port category service with caching — `category-service.ts`
- [x] Room metrics module — `room-metrics.ts`
- [x] Custom server with Socket.IO integration — `server.ts`
- [x] Frontend socket connection in room page

## Phase 7: Build & Compatibility Fixes
- [x] Fix word-service field name mismatch (snake_case → camelCase to match CardData)
- [x] Fix GameView enum import (type-only → value import for runtime usage)
- [x] Add SEO metadata (OpenGraph, Twitter cards) to root and room layouts
- [x] Verify build passes (`next build` → Exit code: 0 ✅)

## Phase 8: Remaining Tasks
- [x] Admin panel CRUD UI pages (words, categories, announcements)
- [x] Bulk CSV word upload feature
- [ ] Test full game flow (create room → play → game over)
- [ ] Test admin panel CRUD operations
- [ ] Test responsive design (mobile/desktop)
- [ ] i18n (multi-language support)
- [ ] Performance optimizations
- [ ] Production deployment configuration
- [ ] Create walkthrough documentation

## Phase 9: Hybrid User Platform (March 2, 2026)
- [x] Add hybrid user/auth foundation (admin + user + guest compatibility)
- [x] Add Prisma economy/profile/store models
- [x] Add user APIs (`/api/user/*`)
- [x] Add store APIs (`/api/store/*`)
- [x] Add match finalize reward API (`/api/game/match/finalize`)
- [x] Build `/dashboard`, `/profile`, `/store` pages
- [x] Connect room flow to reward finalization for logged-in users
- [x] Fix socket disconnect room lookup order bug
- [x] Run `prisma db push` on local database
- [ ] Seed starter store catalog data
- [ ] Complete cosmetic reflection in active game UI

## Phase 10: Lint/CI Hardening (March 2, 2026)
- [x] Remove all ESLint errors (no `any` in updated scope)
- [x] Ensure `npm run lint` exits successfully
- [x] Ensure `npx tsc --noEmit` exits successfully
- [x] Ensure `npm run build` exits successfully
- [ ] Optional: reduce warning-only lint findings in legacy admin/game files

## Phase 11: Warning Zeroing (March 2, 2026)
- [x] Remove all ESLint warnings in current branch scope
- [x] Keep codebase `any`-free in touched files
- [x] Re-verify lint + tsc + build after cleanup

## Phase 12: Cosmetics, Cards, Promotions (March 8, 2026)
- [x] Align overlay UI request/response contracts with real backend APIs
- [x] Add `GET /api/user/inventory`
- [x] Add `card_face` support in Prisma and UI
- [x] Split card front and card back systems
- [ ] Add render strategy for `image` and `template` cosmetics
- [x] Add admin support for template-based cosmetic creation
- [ ] Add bundle schema and admin management
- [ ] Add discount campaign schema and admin management
- [ ] Add coupon code schema and admin management
- [ ] Seed mock cosmetics/offers/coupons with production-shaped data
- [ ] Render equipped avatar/frame in room sidebars
- [x] Render equipped card theme in `GameCard`
- [x] Keep settings page audio/music controls mock but stateful

Reference:
- `docs/dashboard-ui/cosmetics-implementation-plan.md`

### Phase 12 Update (March 8, 2026)
- [x] Overlay dashboard pages now use real request/response contracts
- [x] Inventory overlay now reads owned items from `/api/user/inventory`
- [x] Shop overlay now uses `shopItemId`, `coinBalance`, `owned`, and `equipped`
- [x] Profile sidebar now combines `/api/user/dashboard` and `/api/user/me`
- [x] `/profile`, `/store`, and `/dashboard` pages were aligned to the new economy types
- [x] Verification completed: `npm run lint`, `npx tsc --noEmit`, `npm run build`

### Phase 12 Update (March 9, 2026)
- [x] Prisma schema extended with `card_face`, `renderMode`, `templateKey`, and `templateConfig`
- [x] `UserProfile` now supports an equipped `cardFaceItemId`
- [x] Admin shop item CRUD supports image/template cosmetics and safe JSON config input
- [x] Room page now resolves the logged-in user's equipped `card_face` and applies it to `GameCard`
- [x] Smoke test added: `npm run test:card-face`
- [x] Security check completed: `npm audit --omit=dev` is clean after upgrading `multer`
- [x] Add render strategy for `image` and `template` frame cosmetics in room sidebars
- [x] Render equipped avatar/frame in room sidebars
- [x] Verify socket-auth identity server-side during room join
- [x] Add smoke test coverage for frame theme resolver (`npm run test:frame-theme`)

### Phase 12 Update (March 9, 2026 - Room Cosmetics)
- [x] Room socket payload now includes typed player cosmetics snapshots
- [x] Sidebar renders equipped avatar/frame without changing the approved UI structure
- [x] Socket join ignores spoofed client `authUserId` values and resolves identity from the session cookie
- [x] Verification completed: `npm run test:frame-theme`, `npm run test:card-face`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`
- [x] Render equipped `card_back` in the room transition screen for authenticated users
- [x] Keep guest room flow free of cosmetic fetches and cosmetic rendering
- [x] Add smoke test coverage for card-back resolver (`npm run test:card-back`)

### Phase 12 Update (March 9, 2026 - Card Back Transition)
- [x] Transition screen now renders equipped `card_back` themes for logged-in users
- [x] Guest flow remains unchanged; cosmetics stay gated behind login
- [x] Verification completed: `npm run test:card-back`, `npm run test:card-face`, `npm run test:frame-theme`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`
- [x] Add bundle schema and admin management
- [x] Add discount campaign schema and admin management
- [x] Add coupon code schema and admin management
- [x] Add defense-in-depth admin session checks inside promotion and shop-item admin APIs
- [x] Add smoke test coverage for promotion validators (`npm run test:promotions`)

### Phase 12 Update (March 9, 2026 - Promotions)
- [x] `/admin/promotions` added for bundle, discount, and coupon management
- [x] `/api/admin/promotions/*` CRUD routes added
- [x] Promotion rollout kept checkout-safe; pricing application is intentionally deferred to next slice
- [x] Verification completed: `npx prisma db push`, `npx prisma generate --no-engine`, `npm run test:promotions`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`
- [x] Add production-shaped mock catalog definitions for cosmetics, bundles, discounts, and coupons
- [x] Add idempotent local seed flow for mock catalog (`npm run seed:catalog`)
- [x] Add mock catalog smoke test (`npm run test:catalog`)
- [x] Normalize coin icon design across mock HTML prototype files
- [x] Connect bundle / discount / coupon logic to live store pricing and checkout
- [x] Add typed store catalog and bundle purchase APIs
- [x] Add coupon preview flow for store checkout
- [x] Keep middleware auth edge-safe while preserving login-only store access
- [x] Standardize real UI coin components with a single badge/mark design

### Phase 12 Update (March 9, 2026 - Mock Catalog)
- [x] Local mock catalog now seeds into DB with assets and promotions
- [x] Mock/prototype coin icon language is unified under a single `coin-mark` visual
- [x] Verification completed: `npm run test:catalog`, `npm run seed:catalog`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Live Store Pricing)
- [x] `GET /api/store/catalog` now returns typed item + bundle pricing
- [x] `POST /api/store/purchase` supports optional coupon validation
- [x] `POST /api/store/bundles/purchase` added for bundle checkout
- [x] `POST /api/store/coupons/preview` added for checkout preview
- [x] Dashboard shop and `/store` page now share the same live catalog UI
- [x] Guest flow remains unchanged; cosmetics and checkout stay login-gated
- [x] Middleware build issue fixed by moving shared auth config out of Prisma-bound auth module
- [x] Verification completed: `npx prisma db push`, `npx prisma generate --no-engine`, `npm run test:store-pricing`, `npm run test:catalog`, `npm run test:promotions`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Security Hardening)
- [x] Add route-level admin guards to all remaining admin API handlers
- [x] Sanitize admin announcement HTML on write and on public/admin read
- [x] Restrict announcement media URLs to safe image / YouTube embed formats
- [x] Harden announcement iframe rendering attributes
- [x] Harden admin asset upload with MIME-to-extension mapping and image signature checks
- [x] Add baseline response security headers in `next.config.ts`
- [x] Add smoke tests: `npm run test:admin-guards`, `npm run test:announcement-security`
- [x] Verification completed: `npm run test:admin-guards`, `npm run test:announcement-security`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Promotion Limits)
- [x] Add `usageLimit` / `usedCount` support to discount campaigns
- [x] Expose discount quantity limit management in `/admin/promotions`
- [x] Show live usage counters for discounts and coupons in the admin panel
- [x] Ignore exhausted campaigns in store pricing resolution
- [x] Reserve campaign and coupon usage atomically during item and bundle checkout
- [x] Update mock seed data and smoke tests for promotion limits
- [x] Verification completed: `npx prisma db push`, `npx prisma generate --no-engine`, `npm run test:store-pricing`, `npm run test:promotions`, `npm run test:catalog`, `npm run seed:catalog`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Identity Hardening)
- [x] Stop trusting client-provided `playerId` during socket room join
- [x] Add signed guest-token based guest identity flow
- [x] Bind authenticated room identity to server-verified `userId`
- [x] Remove client `playerId` dependency from `/api/game/match/finalize`
- [x] Add middleware same-origin enforcement for state-changing matched APIs
- [x] Add HTTP rate limits to register, finalize, purchase, equip, coupon preview, and profile update flows
- [x] Add socket origin validation
- [x] Add smoke tests: `npm run test:player-identity`, `npm run test:request-security`
- [x] Verification completed: `npm run test:player-identity`, `npm run test:request-security`, `npm run test:store-pricing`, `npm run test:promotions`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Audit Logging)
- [x] Add `AuditLog` Prisma model for security-sensitive mutation traces
- [x] Add shared `writeAuditLog()` helper with request IP / user-agent capture
- [x] Log admin mutations for announcements, shop items, uploads, bundles, discounts, and coupons
- [x] Log user/economy mutations for profile update, item purchase, bundle purchase, and match finalize
- [x] Keep stored audit metadata bounded to primitive values / primitive arrays only
- [x] Add smoke test: `npm run test:audit-log`
- [x] Verification completed: `npx prisma db push`, `npx prisma generate --no-engine`, `npm run test:audit-log`, `npm run test:player-identity`, `npm run test:request-security`, `npm run test:store-pricing`, `npm run test:promotions`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - CSP and Proxy)
- [x] Replace deprecated `src/middleware.ts` with `src/proxy.ts`
- [x] Add nonce-based CSP generation for HTML page requests
- [x] Pass request nonce into the root layout via `x-nonce`
- [x] Apply nonce to the inline hydration guard script and `next-themes` bootstrap script
- [x] Add smoke test: `npm run test:csp`
- [x] Verification completed: `npm run test:csp`, `npm run test:request-security`, `npm run test:player-identity`, `npm run test:audit-log`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Rich Cosmetic Authoring)
- [x] Expand template cosmetics from flat primitive config to nested JSON authoring
- [x] Add safe template blocks for `palette`, `pattern`, `glow`, `motion`, `frame`, and `overlay`
- [x] Upgrade frame, card-face, and card-back resolvers to use richer effect layers
- [x] Reflect richer frame styling in room sidebar visuals
- [x] Add stronger admin JSON examples and one-click example fill flow
- [x] Add authoring rules doc for AI-assisted cosmetic production (`docs/dashboard-ui/cosmetic-authoring-spec.md`)
- [x] Add smoke test: `npm run test:template-config`
- [x] Verification completed: `npm run test:template-config`, `npm run test:frame-theme`, `npm run test:card-face`, `npm run test:card-back`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Shop Radar and Product Merchandising)
- [x] Add `badgeText` and `isFeatured` fields to `ShopItem`
- [x] Propagate merchandising fields through store/economy response types and Prisma selects
- [x] Update mock catalog and seed flow to include badges, featured flags, and deterministic sort order
- [x] Extend `/admin/shop-items` to manage `sortOrder`, `isFeatured`, and `badgeText`
- [x] Add auto-sliding `Shop Radar` discovery rail under `Quick Equip` in the dashboard sidebar
- [x] Render admin-defined product badges and featured highlighting in shop cards
- [x] Remove the old inline nonce script from `src/app/layout.tsx` to resolve nonce hydration mismatch
- [x] Verification completed: `npx prisma db push`, `npx prisma generate --no-engine`, `npm run test:catalog`, `npm run test:csp`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Dashboard Route and Admin Word Filter)
- [x] Remove the legacy standalone `/dashboard` UI from the runtime path
- [x] Restore `/dashboard` as the canonical authenticated full-page dashboard route
- [x] Redirect authenticated `/` traffic to `/dashboard`
- [x] Convert legacy `/profile` and `/store` routes into dashboard-tab redirects
- [x] Add category filtering UI to `/admin/words`
- [x] Reuse existing `categoryId` admin API filtering support from the words endpoint
- [x] Verification completed: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Admin Cosmetic Live Preview)
- [x] Add a dedicated live preview component for admin cosmetic authoring
- [x] Reuse game-side frame/card-face/card-back resolver logic in the admin preview stage
- [x] Add a mini shop-card snapshot so `badgeText`, rarity, and featured emphasis are visible before save
- [x] Surface invalid template JSON in the preview panel without requiring a save roundtrip
- [x] Verification completed: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Admin Promotion Stability)
- [x] Remove runtime Prisma enum dependence from promotion and shop-item validation
- [x] Replace `z.nativeEnum(@prisma/client)` usages with local typed constant arrays
- [x] Restore working admin fetch/create/update flows for bundles, discounts, coupons, and shop items
- [x] Update `/admin/promotions` to use separate bundle, discount, and coupon editor surfaces
- [x] Replace admin-facing empty-state copy in dashboard `Shop Radar` with player-safe messaging
- [x] Add `Oyna` label to the full-page dashboard play action
- [x] Add smoke test: `npm run test:shop-items`
- [x] Verification completed: `npm run test:promotions`, `npm run test:shop-items`, `npm run test:store-pricing`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Shop Order and Rarity Visuals)
- [x] Add `/api/admin/shop-items/reorder` for transactional bulk sort updates
- [x] Add a dedicated drag-and-drop `Catalog Order` panel to `/admin/shop-items`
- [x] Audit log admin-driven catalog reorder mutations
- [x] Add shared rarity presentation helpers for admin and store surfaces
- [x] Strengthen store card rarity visuals for `common`, `rare`, `epic`, and `legendary`
- [x] Keep the rollout rarity-first; defer `season` merchandising metadata for later
- [x] Add smoke test: `npm run test:shop-order`
- [x] Verification completed: `npm run test:shop-order`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Prisma Enum Hotfix)
- [x] Add explicit runtime enum mapping before Prisma create/update calls for shop items
- [x] Apply the same mapping pattern to promotion create/update mappers
- [x] Update admin shop-item filter queries to use Prisma-safe enum values
- [x] Extend smoke tests to validate mapper output against Prisma enums
- [x] Verification completed: `npm run test:promotions`, `npm run test:shop-items`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit --omit=dev`

### Phase 12 Update (March 9, 2026 - Room Create Regression Fix)
- [x] Allow guest sockets through the custom server handshake instead of rejecting unauthenticated connections
- [x] Fix the room create/join request contract so public home, authenticated dashboard, and room reconnect all use the same socket event
- [x] Standardize room create/join onto ASCII event name `room:request` to avoid future encoding mismatches
- [x] Verification completed: `npm run lint`, `npm run build`
