# apps/api

Mobil uygulama ve gelecekteki ayri backend/API yuzeyi icin ayrilan hedef runtime.

## Neden Hemen Ayirmiyoruz

Bugun:

- tek ekip / tek urun akisindayiz
- realtime, auth ve admin route'lari hala yakindan bagli
- erken ayrim gereksiz deploy ve contract maliyeti getirir

Bu yuzden ilk karar:

- once modular monolith
- sonra gerekirse ayri API runtime

## Gelecekte Bu App'e Tasinabilecekler

- mobil istemciye ozel stabil JSON API'ler
- public API contract'lari
- websocket disi backend gateway logic'i
- admin disi backend servis entegrasyonlari

## Gecis Tetikleri

Su durumlar olusursa `apps/api` gercek runtime'a donusturulmeli:

1. mobil uygulama aktif gelisime girdiginde
2. web ve mobilin farkli release ritmi oldugunda
3. UI'ya yakin olmayan backend route'lari belirgin sekilde buyudugunde
