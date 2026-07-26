# apps/jobs

Arka plan isleri ve zamanlanmis operasyonlar icin ayrilan hedef runtime.

## Beklenen Sorumluluklar

- audit retention / archive job'lari
- notification fan-out veya cleanup isleri
- economy telemetry aggregation
- cache invalidation worker'lari
- gelecekteki word/liveops batch isleri

## Neden Ayrilacak

Bu tur islerin web request runtime'i icinde kalmasi:

- timeout riski yaratir
- deploy yuzeyini kirletir
- yatay olceklemede gereksiz bagimlilik kurar

Bu yuzden jobs runtime'i ayri app olarak planlanir.
