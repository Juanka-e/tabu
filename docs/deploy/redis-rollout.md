# Redis Rollout

Redis burada sadece rate limit icin degil, coklu instance davranisini kontrollu sekilde buyutmek icin kullanilacak.

Temel ilke:

- local gelistirme Redis olmadan calismaya devam eder
- Redis production koordinasyonu icin devreye girer
- room state tek seferde degil, parca parca tasinir
- kritik oyun akisi tasinmadan once test ve guvenlik kontrolleri eklenir

Asama 1:

- dagitik request rate limit
- socket room join throttle
- Redis yoksa memory fallback

Asama 2:

- room presence ve aktif oda kaydi
- reconnect token / oyuncu geri donus koordinasyonu
- birden fazla instance arasinda duplicate join savunmasi

Asama 2 mevcut durum:

- authenticated kullanici icin server-side `userId -> roomCode` membership index eklendi
- Redis varsa TTL yenilenen dagitik kayit kullaniliyor
- Redis yoksa local memory fallback ile gelistirme akisi korunuyor
- join tamamlanamazsa membership claim temizleniyor
- socket disconnect sonrasinda kayit kontrollu sekilde serbest birakiliyor

Asama 3:

- room event fan-out icin Redis adapter degerlendirmesi
- host/anlatici devri gibi zamanlama hassas state'lerin koordinasyonu
- match finalize ve reward akislarinda instance bagimsiz dogrulama

Asama 4:

- cache invalidation
- job / queue ihtiyaci cikarsa ayri kanal tasarimi
- operasyonel metric ve alarm esikleri

Guvenlik notlari:

- `TRUST_PROXY` acik degilse `x-forwarded-for` ve `x-real-ip` basliklarina guvenilmez
- socket ve HTTP IP cozumleme mantigi ayni helper uzerinden kalmali
- admin ve economy akislari Redis hata verse bile fail-open degil, kontrollu fallback veya sert hata karariyla ele alinmali

Hangi state hemen tasinmamali:

- tum `rooms` objesini dogrudan Redis'e koymak
- aktif oyun dongusunu tek adimda distributed hale getirmek
- test edilmeden reconnect mantigini instance'lar arasina yaymak

Bir sonraki teknik hedef:

- reconnect ve host handoff akislarini instance bagimsiz ele almak
- authenticated room presence bilgisini istemci localStorage ipucundan daha az bagimli hale getirmek
- bunun uzerine coklu instance smoke testleri eklemek
