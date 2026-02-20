# Socket.IO Event Reference

## Client -> Server Events

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `odaİsteği` | `{ kullaniciAdi: string, odaKodu?: string, playerId?: string }` | Request to create (if no code) or join a room. |
| `takimlariKaristir` | `void` | (Admin only) Shuffles players between Team A and Team B. |
| `yoneticiligiDevret` | `{ targetPlayerId: string }` | (Admin only) Transfers room admin rights to another player. |
| `oyuncuyuAt` | `{ targetPlayerId: string }` | (Admin only) Kicks and bans a player from the room. |
| `oyunBaslatİsteği` | `{ seciliKategoriler: number[], seciliZorluklar: number[], ayarlar: RoomSettings }` | (Admin only) Starts the game with selected settings. |
| `oyunKontrolİsteği` | `void` | (Admin only) Pauses or Resumes the game timer. |
| `oyunVerisi` | `{ eylem: 'dogru' \| 'pas' \| 'tabu' }` | Narrator sends action result for the current card. |
| `oyunuSifirlaİsteği` | `void` | (Admin only) Resets the game state to lobby. |
| `takimDegistirİsteği` | `void` | Player requests to switch teams (lobby only). |
| `kategoriAyarlariGuncelle` | `{ seciliKategoriler: number[], seciliZorluklar: number[] }` | (Admin only) Updates selected categories/difficulties in lobby. |

## Server -> Client Events

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `kimlikAta` | `string` (UUID) | Sent to client upon first join. Client should save this `playerId`. |
| `lobiGuncelle` | `RoomData` | Broadcasts full room state (players, settings) to all clients. |
| `oyunDurumuGuncelle` | `GameState` | Broadcasts active game state (scores, timer, current card masked). |
| `oyunBasladi` | `void` | Signals that the game has started. Clients switch to Game view. |
| `turGecisDurumGuncelle` | `{ oyunDurduruldu: boolean, kalanSure: number }` | Updates state during turn transitions. |
| `hata` | `string` (Message) | Sent when an error occurs (e.g., room full, name invalid). |
| `odadanAtildin` | `{ odaKodu: string }` | Sent to a player who has been kicked. |
| `kategoriAyarlariGuncellendi` | `{ seciliKategoriler, seciliZorluklar }` | Updates lobby UI when admin changes settings. |
