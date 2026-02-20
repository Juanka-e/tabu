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
