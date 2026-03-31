# Economy Abuse Hardening Guide

Bu rehber `feature/economy-abuse-hardening` branch'inin uygulama sinirlarini tanimlar.

Amac:

- odul ekonomisini daha guvenli hale getirmek
- abuse'u pahali, verimsiz ve izlenebilir hale getirmek
- normal oyuncuyu yanlis pozitif ile cezalandirmamak

## Mevcut Durum Ozeti

Bugunku ekonomi cok dar:

- oyuncu coin'i esas olarak sadece tamamlanan mac odulunden kazaniyor
- `startingCoinBalance = 0`
- varsayilan mac odulleri:
  - kazanma: `120`
  - kaybetme: `40`
  - beraberlik: `40`
- hafta sonu carpani ve genel match/store multiplier var
- store katalog fiyatlari bugun yaklasik:
  - common: `120`
  - rare: `300-340`
  - epic: `480-550`
  - legendary: `820-960`
  - starter bundle: `780`
  - premium bundle: `2200`

Bu haliyle ekonomi "tek source + tek store ladder" modelinde.

Bu branch'in gorevi:

- bu dar modeli source-aware hale getirmek
- ileride gorev, event, comeback reward ve XP eklendiginde sistemin birbirine girmemesini saglamak
- normal oyuncuya gorunur sert ceza vermeden abuse verimini dusurmek

## Bu Branch'te Ne Yapilacak

1. reward eligibility kontrol katmani
- odul yazilacak mac veya oturum gercekten uygun mu
- minimum sure
- minimum anlamli katilim
- minimum farkli hesapli oyuncu

2. coin cap ve diminishing returns temeli
- gunluk cap
- zaman penceresi cap
- tekrar eden pattern'lerde tam blok yerine verim dusurme

3. tekrar eden grup sinyali
- ayni oyuncu grubunun asiri tekrarini izleme
- ayni dizilimle kisa aralikli oyunlari yumusak risk sinyali yapma
- tek basina ceza degil, skor girdisi olarak kullanma

4. suphe skoru ve audit izi
- hard ban yerine skor biriktirme
- neden supheli goruldugunu admin tarafinda izlenebilir hale getirme

5. source-aware economy guardrail
- match reward, admin grant, promo, purchase gibi kaynaklari birbirine karistirmama

6. ekonomi temel modelini netlestirme
- cap mantigini tek global blunt limit yerine source ailesine gore tasarlama
- magazayi "kac dakikada degil, kac anlamli mac esdegerinde" kalibre etme
- XP / level / gorev odullerini coin ekonomisinden ayri planlama

## Bu Branch'te Bilincli Olarak Yapilmayacak

1. otomatik sert ceza
- dogrudan suspend / ban / wallet freeze yok

2. tek basina IP ile karar
- IP ve subnet sadece yumusak sinyal

3. night market implementasyonu
- once ekonomi guardrail oturmali

4. gorev sistemi implementasyonu
- sadece economy ile iliskili dokuman baglaminda kalir

5. wallet ledger buyuk refactor
- bu ayri bir foundation isi

6. invasive fingerprint veya sert device enforcement
- ilk surumde agresif browser fingerprint yok
- dusuk agirlikli sinyal gerekiyorsa ileride ayri privacy review ile ele alinacak

## Uygulama Sirasi

1. mevcut reward / coin yazim noktalarini cikar
2. eligibility kurallarini merkezi hale getir
3. cap ve diminishing returns kur
4. suphe skoru ve audit event'lerini ekle
5. admin review tarafi icin minimum gorunurluk sagla

## Source-Aware Ekonomi Modeli

Bu branch'te alinacak ana karar:

- tek bir `gunluk max coin` butun sistemi yonetmeyecek

Dogru model:

1. `match_reward`
- normal oyun tamamlamadan gelen coin

2. `mission_reward_daily`
- gunluk gorev coin'i

3. `mission_reward_weekly`
- haftalik gorev coin'i

4. `event_reward`
- sureli etkinlik coin'i

5. `comeback_reward`
- geri donus veya retention reward'u

6. `promo_claim`
- coin grant / code / campaign gibi kampanya coin'i

7. `admin_adjustment`
- support veya operasyon kaynakli manuel hareket

Cap ve abuse guardrail yalniz uygun source ailesine uygulanmali.

Ornek:

- `admin_adjustment` normal gameplay cap'ine girmez
- `promo_claim` ile `match_reward` ayni bucket olmaz
- gelecekte gorev coin'i eklendiginde gameplay cap ile birbirini ezmez

## Cap Stratejisi

Simdi sert dusuk global saatlik/gunluk/haftalik cap koymak yanlis olur.

Sebep:

- coin kaynagi su an neredeyse sadece mac
- yarin gorev ve event eklendiginde ayni limitler anlamsizlasir
- normal oyuncuya "neden coin gelmedi" hissi yaratir

Bu yuzden onerilen model iki fazli:

### Faz 1

- eligibility kontrolu
- tekrar eden grup davranisinda diminishing returns
- cok yuksek ama guvenlik amacli "safety ceiling"

Bu ceiling oyuncunun normal oyunda fark etmeyecegi kadar yuksek olmali.

Amac:

- cok bariz farm davranisini sinirlamak
- normal oyuncuya ceza hissettirmemek

### Faz 2

Gorev ve event odulleri gelince:

- source bazli saatlik/gunluk/haftalik budget
- `match_reward` icin ayri budget
- `mission_reward_*` icin ayri budget
- `event_reward` icin ayri budget

Bu model gelecekte sistemi kirmaz.

## Fiyatlandirma Ve Satin Alma Temposu

Ekonomi kararini dakika bazli degil, "anlamli tamamlanmis mac esdegeri" ile vermek daha dogru.

Cunku:

- bugun gercek ortalama mac suresi instrument edilmis degil
- ham sure yerine bitirilmis ve uygun gorulen mac daha saglikli olcu birimi

Bugunku varsayilan odul tablosunda kabaca:

- ortalama bir mac getirisi yaklasik `80 coin` kabul edilebilir
  - kazanma `120`
  - kaybetme `40`

Bu durumda bugunku fiyatlar su tempo hissini veriyor:

- `120` coin -> `1.5` mac civari
- `300-340` coin -> `4-5` mac
- `480-550` coin -> `6-7` mac
- `820-960` coin -> `10-12` mac
- `780` bundle -> `9-10` mac
- `2200` premium bundle -> `27-28` mac

Bu fena bir baslangic degil, ama uzun vadede bilincli ladder lazim.

Onerilen hedef ladder:

1. giris itemleri
- `2-3` anlamli mac

2. yaygin ama arzu edilir itemler
- `5-7` anlamli mac

3. orta-prestij itemler
- `8-12` anlamli mac

4. yuksek prestij itemler
- `14-20` anlamli mac

5. premium veya koleksiyon bundle
- `25-35` anlamli mac

Ana kural:

- oyuncu her oturumda "ulasilabilir bir sonraki hedef" gormeli
- ama premium ladder da hemen bitmemeli

## XP Ve Level Hakkinda Karar

Evet, uzun vadede XP/level eklemek mantikli.

Ama coin ile ayni mantiga baglamak dogru degil.

Dogru ayrim:

- `coin` -> harcanabilir ekonomi
- `xp` -> kalici ilerleme hissi
- `level` -> prestij ve ilerleme katmani

Ilk surum icin onerilen model:

1. XP sadece uygun gorulen maclardan ve ileride gorevlerden gelir
2. her level'da zorunlu coin odulu verme
3. coin yerine daha cok:
   - rozet
   - banner
   - profil kimligi
   - milestone odulu

Sebep:

- her level coin vermek ikinci bir coin muslugu yaratir
- abuse baskisi coin uzerinde daha da artar

Daha saglikli model:

- erken level'larda kucuk onboarding odulleri olabilir
- asil oduller milestone level'larda verilir
  - ornek: `5 / 10 / 15 / 20`

## Gorev Ve Etkinlik Sistemi Ne Zaman

Gorev sistemi bu branch'te implement edilmemeli.

Dogru siralama:

1. reward eligibility ve soft abuse guardrail
2. source-aware ekonomi modeli
3. sonra gorev/event reward tasarimi
4. sonra XP / level entegrasyonu
5. en son night market gibi retention vitrini

Yani gorev sistemi ekonomiden once degil, ekonomi source ayrimi oturduktan sonra gelmeli.

## IP, Ayni Ev, Fingerprint

Burada sert davranmak yanlis olur.

Gercek dunya:

- ayni evde birden fazla oyuncu olabilir
- ayni cihaz aginda normal oyun olabilir
- NAT ve paylasimli baglanti cok yaygindir

Bu yuzden:

- IP tek basina karar vermez
- subnet tek basina karar vermez
- device fingerprint ilk surumde kullanilmaz

Eger ileride fingerprint dusunulurse:

- yalniz yumusak sinyal olur
- asla tek basina enforcement tetiklemez
- privacy ve operasyon maliyeti ayri review ister

Ilk surum icin dogru sinyal karmasi:

- tekrar eden lineup
- mac hizi / velocity
- hesap yasi
- katilim cesitliligi
- trusted IP / subnet yumusak katkisi
- access signal surekliligi

## Oyuncuya Hissettirmeme Prensibi

Oyuncu su hissi almamali:

- "sistem beni gizlice cezalandirdi"
- "arkadaslarla oynadim diye coin kesildi"

Bu yuzden bu branch'te tercih:

- hard ceza yok
- buyuk blok yok
- once yumusak verim dusurme
- audit ve review var

Sistem abuse'u pahali hale getirmeli, gosterisli ceza vermemeli.

## Admin Tarafindan Ayarlanabilirlik

Evet, ama sinirsiz kural paneli olarak degil.

Dogru model:

- birkac bounded ayar
- guvenli varsayilanlar
- admin'in her esigi keyfi olarak 0-100 oynamadigi dar araliklar

Ornek ileri asama ayarlari:

- match reward multiplier
- safety ceiling enable/disable
- repeated-group damping profile
- review threshold profile

Yapilmamasi gereken:

- her heuristic icin ayri serbest numeric admin paneli

Bu hem operator hatasini artirir hem sistemi karmasiklastirir.

## Guardrail'ler

1. false positive maliyeti yuksek
- bir kural oyuncuyu haksiz yere cezalandiriyorsa sert olmamali

2. hard block son care
- once odul dusurme veya odulu yazmama

3. admin tarafi aciklanabilir olmali
- neden riskli oldugu metadata ile gorunmeli

4. source ayrimi bozulmamali
- support grant ile normal match reward ayni kategoriye dusmemeli

## Referans Dokumanlar

- `docs/guides/economy-abuse-strategy-guide.md`
- `docs/guides/night-market-and-missions-strategy-guide.md`
- `docs/guides/admin-user-observability-guide.md`
