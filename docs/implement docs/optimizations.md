# Optimizasyonlar

Bu belge, 2026-02-20 tarihinde gerçekleştirilen iki teknik optimizasyonu açıklar.

---

## 1. `getRoomBySocketId` O(n) → O(1) — Ters Index

**Dosya:** `src/lib/socket/game-socket.ts`

### Problem

```typescript
// ESKİ: Tüm odaları ve oyuncuları iterate ediyordu
function getRoomBySocketId(socketId: string) {
    for (const room of rooms.values()) {          // O(rooms)
        if (room.oyuncular.some(p => p.id === socketId))  // O(players)
            return room;
    }
}
```

Bu fonksiyon `oyunVerisi`, `takimDegistirİsteği`, `oyunKontrolİsteği`, `kategoriAyarlariGuncelle` gibi **her socket event'inde** çağrılıyordu. 10 oda × 10 oyuncu = her event'te 100 kontrol.

### Çözüm

```typescript
// YENİ: socketId → roomCode reverse index
const socketToRoom = new Map<string, string>();

function getRoomBySocketId(socketId: string) {
    const code = socketToRoom.get(socketId);  // O(1)
    return code ? rooms.get(code) : undefined; // O(1)
}
```

| Güncelleme Noktası | Ne Yapılıyor |
|---|---|
| `odaİsteği` handler → socket.join sonrası | `socketToRoom.set(socket.id, roomCode)` |
| `disconnect` handler → ilk satır | `socketToRoom.delete(socket.id)` |

### Etki

| | Eski | Yeni |
|---|---|---|
| `getRoomBySocketId` karmaşıklığı | O(n × m) | **O(1)** |
| Bellek ek yükü | 0 | ~1 Map entry / bağlı socket |
| Oda/Oyuncu sayısından bağımsızlık | ✗ | ✓ |

---

## 2. `page.tsx` God Component Refactor

**Dosya:** `src/app/room/[code]/page.tsx` + 4 yeni alt component

### Problem

`page.tsx` 840 satır olup socket bağlantısı, tüm state yönetimi ve 4 farklı oyun görünümünün inline JSX'ini tek dosyada barındırıyordu.

### Çözüm: Alt Componentlere Bölme

```
room/[code]/
├── page.tsx          (840 → 295 satır  — yalnızca socket + state + orkestrasyon)
└── _components/
    ├── transition-screen.tsx   (~50 satır  — tur geçiş sayacı)
    ├── active-game.tsx         (~215 satır — skor, timer, kart, kontroller)
    ├── game-over-screen.tsx    (~65 satır  — kazanan ekranı)
    └── username-prompt.tsx     (~55 satır  — kullanıcı adı modal)
```

**Props akışı:**

```
page.tsx (state + socket)
  ├─→ <TransitionScreen transition={...} />
  ├─→ <ActiveGame gameState={...} myRole={...} onWordAction={...} ... />
  ├─→ <GameOverScreen gameOverData={...} onReturnToLobby={...} />
  └─→ <UsernamePrompt onConfirm={...} />
```

### Etki

| Metrik | Önce | Sonra |
|---|---|---|
| `page.tsx` satır sayısı | 840 | **295** |
| Toplam satır (5 dosya) | 840 | ~680 (her component kendi sorumluluğunda) |
| Component bağımsızlığı | ✗ (her şey tek dosyada) | ✓ (her view ayrı dosya) |
| Test edilebilirlik | Zor | Her component izole test edilebilir |
| Re-render kapsamı | Tüm page | Yalnızca ilgili sub-component |

---

## TypeScript Derleme Kontrolü

```
npx tsc --noEmit  →  ✅ Sıfır hata
```
