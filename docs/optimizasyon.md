# Optimizasyon Notlari

Bu dosya, hemen uygulanmayan ama production'a yaklasirken tekrar ele alinmasi gereken performans ve operasyon iyilestirmelerini toplar.

## Bildirim Yenileme

Mevcut dashboard akisinda okunmamis bildirim sayisi periyodik olarak tekrar cekiliyor. Bu mevcut urun asamasinda kabul edilebilir, ancak oyuncu sayisi buyudugunde daha verimli hale getirilmelidir.

### Gelecekte Yapilacaklar

1. Event-driven refresh
- unread count yenilemesini yalnizca gercek bir bildirim olayi oldugunda tetiklemek
- gereksiz polling sayisini dusurmek

2. Cache / Redis
- unread count ve benzeri hafif sayaclari shared cache katmanina almak
- coklu instance ve PM2 senaryosunda tutarli davranis elde etmek

3. Gereksiz focus refresh azaltma
- `focus` ve `visibilitychange` uzerinden gelen tekrar fetch akislarini azaltmak
- ayni kullanicinin kisa surede ardisik sayac istegi gondermesini sinirlamak

## Not

Bu maddeler `feature/cache-and-rate-limit-foundation` ve production hazirlik dilimlerinde tekrar acilmalidir.
