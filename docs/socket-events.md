# Socket.IO Event Reference

## Client -> Server Events

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `room:request` | `{ kullaniciAdi: string, odaKodu?: string, guestToken?: string }` | Request to create (if no code) or join a room. ASCII event name is used to avoid encoding regressions across client and server files. |
| `takimlariKaristir` | `void` | (Admin only) Shuffles players between Team A and Team B. |
| `yoneticiligiDevret` | `{ targetPlayerId: string }` | (Admin only) Transfers room admin rights to another player. |
| `oyuncuyuAt` | `{ targetPlayerId: string }` | (Admin only) Kicks and bans a player from the room. |
| `oyunBaslatIsteği` | `{ seciliKategoriler: number[], seciliZorluklar: number[], ayarlar: RoomSettings }` | (Admin only) Starts the game with selected settings. |
| `oyunKontrolIsteği` | `void` | (Admin only) Pauses or resumes the game timer. |
| `oyunVerisi` | `{ eylem: 'dogru' | 'pas' | 'tabu' }` | Narrator sends action result for the current card. |
| `oyunuSifirlaIsteği` | `void` | (Admin only) Resets the game state to lobby. |
| `takimDegistirIsteği` | `void` | Player requests to switch teams (lobby only). |
| `kategoriAyarlariGuncelle` | `{ seciliKategoriler: number[], seciliZorluklar: number[] }` | (Admin only) Updates selected categories and difficulties in lobby. |

## Server -> Client Events

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `lobiGuncelle` | `RoomData` | Broadcasts full room state (players, settings) to all clients. |
| `oyunDurumuGuncelle` | `GameState` | Broadcasts active game state (scores, timer, current card masked). |
| `oyunBasladi` | `void` | Signals that the game has started. Clients switch to game view. |
| `turGecisDurumGuncelle` | `{ oyunDurduruldu: boolean, kalanSure: number }` | Updates state during turn transitions. |
| `hata` | `string` | Sent when an error occurs. |
| `odadanAtildin` | `{ odaKodu: string }` | Sent to a player who has been kicked. |
| `kategoriAyarlariGuncellendi` | `{ seciliKategoriler, seciliZorluklar }` | Updates lobby UI when admin changes settings. |

## March 9, 2026 Regression Note

- Guest room creation/join was broken because the custom Socket.IO middleware in `server.ts` rejected unauthenticated sockets.
- Authenticated full-page dashboard room creation was also broken because the dashboard client emitted a different room-request event name than the socket server expected.
- The fix keeps guest sockets allowed at handshake time and standardizes room create/join onto the ASCII event name `room:request`.
