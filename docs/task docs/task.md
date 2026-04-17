# Görev Kaydı

> Son güncelleme: 18 April 2026
> Durum: aktif execution log

## Çekirdek Kurallar
- Her branch tek konu taşır.
- Implementasyon sonunda `review`, `test`, `refactor`, `docs`, `push` kapanışı zorunludur.
- PR olmadan önce branch kapsam dışına çıkılmaz.

## Yakın Zamanda Tamamlanan Branch'ler
- `feature/admin-user-observability`
- `feature/economy-abuse-hardening`

## Aktif Branch
### `feature/gameplay-ui-polish`
Hedef:
- room, lobby ve dashboard arasında oyuncu kimliği UX'ini sadeleştirmek
- `displayName` akışını tutarlı hale getirmek
- audit kimlik snapshot'ını gelecekteki moderasyon akışlarına hazırlamak
- gameplay yüzeylerindeki gereksiz gürültüyü azaltmak

Bu branch'te tamamlanan ana işler:
- settings kaynaklı `displayName` yönetimi
- lobby quick edit ile kayıtlı / guest isim akışı
- kayıtlı kullanıcıda boş isim için `username` fallback
- audit identity snapshot alanları
- audit tarafında guest / kayıtlı ayrımı
- room üst bar ve mobil yardımcı menü temizliği
- pause sırasında üst modallara erişim
- hazırlık ekranı UX iyileştirmesi
- ilk geçişte `Oyun başlıyor`, sonraki geçişlerde `Anlatıcı değişiyor` copy'si
- countdown'ın `0`'da bitmesi
- stale room storage yüzünden oluşan yanlış oda blokajının kaldırılması
- kayıtlı kullanıcı için server-side aktif oda korumasının eklenmesi
- create/join anında O(1) lookup için process-local registered room index optimizasyonu
- bildirim sheet close aksiyonunun yeniden üst sağa alınması
- hızlı kuşan bölümünün tekrar tek satıra alınması
- envanterde kuşanılan kozmetiği doğrudan çıkarabilme
- room / lobby logosunun üst merkezde yeniden dengelenmesi

Bu branch'te açık kalan takip maddeleri:
- admin kategoriler sürükle-bırak davranışını gerçek kullanımda doğrulama
- gameplay header / logo responsive son turu
- aktif oda korumasını reconnect ve farklı browser senaryolarında son kez kontrol etme
- bildirim sheet ve toast yerleşimini cihazlarda son kez kontrol etme
- hızlı kuşan ve önerilenler oranlarını küçük bir polish turundan geçirme

Kapsam dışı bırakılanlar:
- admin detaylı maç geçmişi yüzeyi
- room şifre akışı
- oda kapasitesi / oyuncu sırası yönetimi
- XP, görev ve event runtime

## Sonraki Branch Adayları
1. `feature/admin-match-history-review`
2. `feature/admin-categories-dnd-polish`
3. `feature/room-rules-and-capacity-controls`
4. `feature/cache-and-rate-limit-foundation`
5. `feature/post-launch-economy-observability-review`
6. `feature/admin-player-messaging`

## Referanslar
- `docs/guides/economy-abuse-hardening-guide.md`
- `docs/guides/player-display-name-and-audit-strategy-guide.md`
- `docs/cache-and-storage-strategy.md`
- `docs/implement docs/remaining.md`
