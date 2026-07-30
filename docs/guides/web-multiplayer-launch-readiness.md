# Web Multiplayer Açılış Kontrolü

> Durum: disposable DB kullanan otomatik CI kapısı
> Kapsam: iki guest oyuncunun lobby ve ilk hazırlık senkronu

## Amaç

Tek sayfa smoke testleri Socket.IO oda durumunun iki oyuncu arasında doğru
yayınlandığını kanıtlamaz. Bu kapı iki izole browser context açar ve gerçek UI
üzerinden aşağıdaki akışı çalıştırır:

1. host guest adıyla oda oluşturur
2. ikinci guest oda koduyla katılır
3. iki oyuncu karşı takımlara yerleşir
4. kategori ve zorluk fixture'ı lobby'ye gelir
5. host oyunu başlatır
6. iki oyuncu ilk hazırlık ekranını görür
7. host hazırlığı durdurur ve guest durumu senkron görür
8. mobil guest viewport'unda yatay taşma olmadığı doğrulanır

## Fixture Yaşam Döngüsü

`scripts/test-web-multiplayer-launch.ts` yalnız
`WEB_LAUNCH_DB_E2E=true` ve `tabu_test` veritabanında çalışır.

- benzersiz bir görünür kategori ve dört kelime ekler
- Chromium ve WebKit projelerini tek worker ile çalıştırır
- başarılı veya başarısız sonuçtan bağımsız `finally` içinde kelime ve
  kategoriyi siler
- migration, database reset veya volume silme çalıştırmaz

Yerel Docker/MySQL kapalıysa komut açıkça skip olur. CI disposable MySQL
üzerinde akış zorunludur.

## Komutlar

```powershell
npm run test:web-multiplayer-contract
npm run test:web-multiplayer
```

İki komut da `npm run test:web-launch-readiness` zincirine bağlıdır.

## Bilinçli Sınırlar

- maç tamamlanmaz ve ödül finalize edilmez
- coin/XP sonucu üretilmez
- reconnect, host handoff ve dört kayıtlı oyuncu senaryosu bu testin kapsamı
  değildir
- Chromium ve WebKit otomasyonu fiziksel cihaz kanıtı değildir
- gerçek touch, sanal klavye ve cihaz performansı manuel smoke turunda kalır
