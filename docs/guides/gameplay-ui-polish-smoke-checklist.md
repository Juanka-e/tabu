# Gameplay UI Polish Smoke Checklist

Bu checklist `feature/gameplay-ui-polish` son tur dogrulama icin tutulur.

Amaç:

- room
- lobby
- dashboard
- notifications
- quick equip

yuzeylerinde kritik UX kirilmalarini hizli yakalamak.

## Ön Koşullar

- local app ayakta olmali
- test kullanicisi ile giris yapilabiliyor olmali
- en az bir kullanicida avatar / frame / card back gibi envanter item'lari bulunmali
- en az bir okunmamis bildirim ve tercihen bir support ticket bildirimi bulunmali

## Room Header

1. mobil genislikte `brand`, `stage`, `room code`, utility butonlari tek satirda veya kontrollu sarilarak gorunmeli
2. `Hushle` logosu sure veya ana oyun alanini kapatmiyor olmali
3. dashboard butonu ve utility menu butonu ayni anda tiklanabilir olmali
4. utility menu acikken ekranin sag disina tasma olmamali
5. desktop gorunumde identity editor butonu logo alanina carpismamali

## Dashboard Header

1. dashboard ust barinda logo kucuk ekranlarda asiri tombik durmamali
2. duyurular, tema, admin ve cikis aksiyonlari dar ekranda tiklanabilir kalmali
3. mobilde avatar rozetinin gizlenmesi layout kirigi yaratmamali
4. aktif oda kutusu varsa `Odaya Don` butonu ekrani itmemeli

## Active Room Guard

1. kayitli kullanici dogru room URL'i ile girdiginde room acilmali
2. kayitli kullanici baska aktif odaya bagliyken farkli `/room/[code]` URL'i acarsa blok ekrani gelmeli
3. blok ekranindaki `Aktif Odaya Don` aksiyonu dogru room'a gitmeli
4. host geri donusu gerekiyorsa copy bunu acikca anlatmali

## Notifications

1. notifications sheet mobilde sagdan acilirken ana content ile toast cakismamali
2. sheet acikken yeni toast gorunurse ustte yeterli boslukla durmali
3. `Tumunu oku` ve `Tumunu temizle` aksiyonlari dar ekranda alt satira duzgun inmeli
4. support ticket bildirimi `Yardim merkezinde ac` aksiyonuyla support sheet'i dogru acmali
5. sheet kapatma butonu her zaman gorunur kalmali

## Quick Equip

1. inline quick equip rail mobilde 4 kolon olarak duzgun hizalanmali
2. equipped item kutulari kare/oranli durmali, ezilmemeli
3. `+` kutusu diger kutularla ayni gorsel agirlikta olmali
4. inventory'ye gecis tek tikla calismali
5. kuşanili item yoksa rail bos state'te de layout bozulmamali

## Çoklu Sekme / Reconnect

1. ayni kullanicinin ayni room'da iki sekmesi acik olabilir
2. sekmelerden biri kapaninca diger sekme odadan dusmus gibi gorunmemeli
3. dashboard'dan yeni oda acma denemesi aktif room varken bloklanmali
4. room refresh sonrasi host ise host hakki geri gelmeli

## Admin Category DnD Son Tur

1. ana kategoriler drag-drop ile yer degistirince kalici siralama korunmali
2. alt kategori yeni root gibi gorunmemeli
3. save feedback'i gorunmeli
4. refresh sonrasi siralama tutarli kalmali

## Playwright İçin Sonraki Adım

Bu checklist'teki maddeler tamamen e2e'ye tasinmadan once su yuzeyler icin minimum smoke otomasyonu dusunulebilir:

- dashboard load + active room card render
- room blocked-entry screen render
- notifications sheet open/close
- inline quick equip rail render

Not:

- gercek socket/game flow'lari tam e2e'ye gecmeden once fixture ve test kullanicisi stratejisi netlestirilmeli
- Redis'siz local gelistirme korunmali; smoke testler memory fallback ile de calisabilmeli
- auth'siz temel route sagligi icin `SMOKE_BASE_URL=http://localhost:3100 npm run test:gameplay-ui-http-smoke` gibi hizli bir HTTP smoke kullanilabilir
- auth'siz temel UI smoke icin `SMOKE_BASE_URL=http://localhost:3100 npm run test:gameplay-ui-playwright` komutu kullanilabilir
