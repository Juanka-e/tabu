# Kalan İşler

> Son güncelleme: 17 April 2026
> Durum: aktif uygulanabilir backlog

## Şu Anki Öncelik Sırası
1. `feature/gameplay-ui-polish`
2. `feature/admin-match-history-review`
3. `feature/admin-categories-dnd-polish`
4. `feature/room-rules-and-capacity-controls`
5. `feature/post-launch-economy-observability-review`
6. `feature/cache-and-rate-limit-foundation`
7. `feature/admin-promotions-ux`
8. `feature/cosmetic-render-upgrade`
9. `feature/admin-cosmetic-authoring`
10. `feature/analytics-event-foundation`
11. `feature/word-analytics-liveops`
12. `feature/post-launch-xp-level-foundation`
13. `feature/post-launch-missions-foundation`
14. `feature/post-launch-night-market-foundation`
15. `feature/release-ops-docs`
16. `docs/encoding-cleanup`
17. `feature/wallet-ledger-foundation`

## Aktif Branch
### `feature/gameplay-ui-polish`
Tamamlananlar:
- kayıtlı kullanıcı için `displayName -> username` fallback akışı
- settings ve lobby quick edit arasında canlı isim senkronu
- boş `displayName` temizlendiğinde kayıtlı kullanıcıda hesap adına dönüş
- guest isim akışının lobby bazlı kalması
- oyun başladıktan sonra isim düzenlemeyi kilitleme
- audit lineup identity snapshot yapısı
- audit tarafında guest / kayıtlı kimlik ayrımı
- room üst barı ve mobil yardımcı menü sadeleştirmesi
- pause sırasında sağ üst modalları erişilebilir kılma
- lobby branding logosunu system settings ile dinamik kullanma
- hazırlık ekranının sadeleştirilmesi ve ilk geçiş mesajlarının düzeltilmesi
- dashboard profil alanında avatar + frame görünümünün toparlanması
- stale `tabu_activeRoomCode` yüzünden oluşan yanlış `lobidesin` blokajının kaldırılması
- bildirim sheet başlığının ve close aksiyonunun yeniden düzenlenmesi
- hızlı kuşan alanının tekrar tek satıra çekilmesi
- kayıtlı kullanıcı için server-side aktif oda kontrolü
- envanterde kuşanılan kozmetiği doğrudan çıkarabilme
- room / lobby logosunun üst merkezde daha dengeli konumlanması

Açık kalanlar:
- admin kategoriler sürükle-bırak davranışını gerçek kullanımda doğrulama ve gerekiyorsa polish
- room / lobby logo konumlandırmasını son bir responsive turdan geçirmek
- in-game ve dashboard hızlı kuşan görsellerinde son oran / boşluk iyileştirmeleri
- bildirim sheet ile toast çakışmasını gerçek cihazlarda son bir tur kontrol etmek
- aktif oda korumasını çoklu sekme / reconnect senaryolarında son bir tur doğrulamak

Bilinçli olarak bu branch'te yapmıyoruz:
- admin detaylı maç geçmişi yüzeyi
- room şifre sistemi
- oda kapasitesi ve oyuncu sırası kural paneli
- XP / görev / event runtime

## Yakın Sonraki Branch'ler

### `feature/admin-match-history-review`
- admin kullanıcı inceleme akışına maç geçmişi yüzeyi
- maç süresi, skor tipi, takım dağılımı, anlatıcı rotasyonu ve ekonomi etkisi görünürlüğü
- audit ile maç detayı arasında daha adil moderasyon geçişi

### `feature/admin-categories-dnd-polish`
- kategori sürükle-bırak akışını doğrulama
- reorder sonrası geri bildirim / hata durumları
- kategoriler sayfasındaki UTF-8 ve copy temizliği
- mobil / düşük hassasiyetli pointer davranışını iyileştirme

### `feature/room-rules-and-capacity-controls`
- oda kapasitesi için net üst sınır kararı
- dengesiz takım senaryoları için yönetici davranışı
- gerekirse bounded oyuncu sırası / anlatıcı sırası kontrolü
- oda şifresi eklenirse ayrı, sade bir akışla ele alma

### `feature/cache-and-rate-limit-foundation`
- Redis / Valkey abstraction
- development memory fallback
- production shared cache ve rate limit store
- dashboard summary short TTL cache
- store catalog cache
- notification unread counter
- economy guard rolling counters
- repeated-group keyed counters
- websocket / multi-instance koordinasyon hazırlığı
- referans: `docs/cache-and-storage-strategy.md`

### `feature/post-launch-economy-observability-review`
- canlıdan sonra gerçek coin kazanımı gözlemi
- mağaza satın alma hızı
- retention ve pacing ayarları
- economy guard tetiklerinin saha verisiyle yeniden tuning edilmesi

## Uzun Vadeli Notlar
- Redis geldiğinde source of truth yine MySQL olacak; Redis yalnız cache / counter / coordination katmanı olacak.
- non-triggered finalize kayıtları ileride daha hafif telemetry yoluna taşınabilir.
- eski `game.match.finalize` kayıtları için retention / archive planı gerekli.
- admin kullanıcı mesajlaşma sistemi ayrı bir operasyon branch'i olarak düşünülmeli.

## Referans Rehberler
- `docs/guides/economy-abuse-hardening-guide.md`
- `docs/guides/economy-progression-and-pricing-guide.md`
- `docs/guides/player-display-name-and-audit-strategy-guide.md`
- `docs/cache-and-storage-strategy.md`
