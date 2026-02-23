# Backend Socket Architecture

## Overview
The real-time game logic is handled by a custom Socket.IO server integrated with Next.js. The core logic resides in `src/lib/socket/game-socket.ts`.

## Key Components

### 1. GameSocket (`src/lib/socket/game-socket.ts`)
This file exports `setupGameSocket(io: Server)`, which initializes the socket event listeners.

*   **State Management:**
    *   `rooms`: A `Map<string, RoomData>` storing the state of all active game rooms.
    *   `socketToRoom`: A `Map<socketId, roomCode>` reverse index enabling **O(1)** room lookup by socket ID (avoids iterating all rooms on every event).
    *   `wordActionTimestamps`: Tracks player actions to prevent spam.
    *   `roomJoinAttempts`: Rate limiting for room creation/joining.

*   **Room Structure (`RoomData`):**
    *   `odaKodu`: Unique 4-character room code.
    *   `creatorId`: The **socket ID** of the current room host. Used for permission checks.
    *   `creatorPlayerId`: The **persistent Player ID** (UUID) of the room creator. Used to restore `creatorId` upon reconnection.
    *   `oyuncular`: List of players in the room.
    *   `oyunDurumu`: Current game state (scores, turn, timer, etc.).
    *   `banList`: Set of banned player IDs and IPs.

### 2. Connection Handling
*   **Connection:** When a client connects, they are assigned a socket ID.
*   **Identification (`odaİsteği`):**
    *   Clients send `kullaniciAdi`, `odaKodu` (optional), and `playerId` (optional, for reconnection).
    *   **New Player:** Generated a UUID (`playerId`) and sent back via `kimlikAta` event.
    *   **Returning Player:** Identified by `playerId`. If found in the room, their `socket.id` is updated.
    *   **Admin Persistence:** If the returning player matches `creatorPlayerId`, the room's `creatorId` is updated to the new `socket.id`, preserving admin privileges.

### 3. Game Loop
*   **Timer:** A `setInterval` runs on the server for each room to handle turn limits and state transitions.
*   **State Updates:** Game state changes are broadcast to all room members via `oyunDurumuGuncelle` and `lobiGuncelle`.

### 4. Security & Protections
*   **WebSocket Authentication:** The `server.ts` utilizes a Socket.IO middleware that checks for a valid `next-auth/jwt` session token. Unauthorized (not logged in) connections are immediately rejected.
*   **Rate Limiting & DDOS Protection:**
    *   **Room Joins:** Rate limited (`ROOM_JOIN_MAX_ATTEMPTS` per `ROOM_JOIN_WINDOW_MS`) to prevent connection flooding.
    *   **Word Actions:** A cooldown (`WORD_ACTION_COOLDOWN_MS = 500`) prevents users from spamming card actions and exhausting the word pool or database connections.
    *   **Word Pool Priming:** A concurrency mutex (`primingLocks`) in `word-service.ts` prevents "cache stampede" scenarios where multiple simultaneous requests could trigger duplicate heavy database queries when the room's word pool runs out.
*   **IP Spoofing Protection:** The `getClientIp` function only trusts the `x-forwarded-for` header if explicitly allowed via the `TRUST_PROXY=true` environment variable.

## 5. Persistence Strategy & Authentication
The real-time and application-wide persistence is managed through a combination of NextAuth sessions and Socket.IO identifiers.

*   **NextAuth Session (JWT):** NextAuth handles user login via Credentials. We support two login flows:
    *   **Registered Users:** Validated against the Prisma `User` table, passing their DB role (`admin` or `user`) to the Session token.
    *   **Guest Users:** Validated via a custom `guest-login` provider generating a temporary, non-persisted `guest_${timestamp}` ID and a `"guest"` role.
*   **Socket.IO Verification:** The `server.ts` uses NextAuth's `getToken` middleware to reject any socket connection request lacking a valid NextAuth session.
*   **Game State Persistence:** Since `socket.id` changes on every connection (page refresh), we use `playerId` (a UUID stored in `localStorage` on the client) to persistently identify users within a specific room and restore their states (including admin rights for `creatorId`).
