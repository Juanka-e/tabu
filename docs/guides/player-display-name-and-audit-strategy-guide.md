# Player Display Name And Audit Strategy Guide

Bu rehber, kayitli oyuncularin diger oyunculara gorunecek adinin nasil yonetilecegini ve audit tarafinda bunun nasil izlenmesi gerektigini tanimlar.

## Temel Ayrim

Sistemde uc ayri kimlik katmani vardir:

1. `username`
- hesap kimligidir
- benzersizdir
- login, admin ve teknik referanslarda ana kimlik olarak kalir

2. `displayName`
- oyuncunun diger oyunculara gorunen genel adidir
- oyuncu deneyimi odaklidir
- lobby ve oyun ici gorunumde varsayilan ad olarak kullanilabilir

3. `session / room nickname`
- oda bazli gecici takma ad modelidir
- ilk asamada eklenmeyecektir

## Uygulama Karari

Ilk surum icin onerilen model:

- kayitli kullanici gorunen adini `Settings` icinden degistirir
- room join akisinda kullanilacak gorunen ad:
  - once `displayName`
  - yoksa `username`
- guest oyuncu ise giriste yazdigi isimle devam eder

Bu sayede:

- oyuncu tarafi esneklik kazanir
- moderation ve audit tarafi gereksiz yere karmasiklasmaz
- oyuncu her lobby icin ayri maske isim tasimaz

## Neden Lobby Icinde Serbest Rename Simdi Gelmiyor

Lobby veya oyun icinde canli ad degistirme ilk bakista kullanisli gorunse de su maliyetleri getirir:

- moderation review zorlasir
- support tarafinda "kim kimdi" takibi kirilir
- audit snapshot'lari daha karmasik hale gelir
- ayni oyuncu kisa surede birden fazla adla gorunebilir

Bu yuzden v1 urun karari:

- `displayName` global ayar olarak degissin
- lobby / oyun ici canli rename sonraki asamada tekrar degerlendirilsin

## Sonraki Asamada Dusunulebilecek UX

Ileride `gameplay-ui-polish` veya ilgili oyuncu kimligi branch'inde su model dusunulebilir:

1. dashboard / room ust barinda oyuncu kimlik butonu
- kucuk avatar
- aktif gorunen isim
- tiklaninca profil / isim paneli

2. canli degisiklik kisiti
- oyun aktifken degil, sadece lobby durumunda
- ayni oda icin tek oturumda sinirli sayida degisiklik

3. oyun ici yansima
- ad degisikligi yapildiginda room oyuncu listesi ve sidebar guncellenir
- ama audit snapshot o anki adi ayri saklar

Bu alan simdilik plan seviyesindedir, bu branch'te implement edilmeyecektir.

## Audit Tarafinda Zorunlu Snapshot Alani

Display name feature'i geldiginde audit canli profile bakarak isim gostermemelidir.

Olay aninda su snapshot alinmalidir:

1. `identityType`
- `registered`
- `guest`

2. `accountUserId`
- kayitliysa var
- guest ise `null`

3. `accountUsernameSnapshot`
- kayitli hesabin degismeyen teknik username'i

4. `displayNameSnapshot`
- o an diger oyunculara gorunen isim

5. `playerId`
- room / socket tarafindaki teknik oyuncu kimligi

## Audit UI Ilkesi

Ekonomi veya oyun review ekraninda:

- bir kaydin sahibi olan oyuncu ayri gosterilmelidir
- ayni macin lobby kadrosu ayri gosterilmelidir
- guest ve kayitli hesap farki net badge ile anlasilmalidir

Onerilen gosterim:

- `KaptanMert`
  - `registered`
  - `@juanka`
  - `userId: 42`

- `Mert`
  - `guest`
  - `playerId: guest:abc123`

Bu sayede:

- displayName sonradan degisse bile eski audit bozulmaz
- support / moderation / economy review tek veri modeliyle ilerler

## Branch Planlama Notu

Bu rehberdeki tam audit kimlik ayrimi ve displayName snapshot isi:

- `feature/economy-abuse-hardening` kapsaminda tamamlanmayacak
- `feature/gameplay-ui-polish` veya ilgili oyuncu kimligi branch'inde ele alinacak

Bu branch'te mevcut ekonomi review UI okunabilirligi ve finalize akis stabilitesi onceliklidir.
