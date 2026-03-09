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
