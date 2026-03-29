# Branding Assets Guide

Son guncelleme: 24 March 2026

## Amac

Bu rehber branding asset uretirken yanlis dosyayi yanlis yuzeye baglamayi engellemek icin vardir.

Temel kural:

1. `logo` ile `og image` ayni dosya olmamali
2. `favicon` ayri export olmalidir
3. UI'da kullanilan logo dosyasi sahneli poster degil, sikisiz crop edilmis wordmark olmalidir

## Asset Tipleri

### 1. Logo Asset

Kullanim:
- ana sayfa
- login
- register
- desktop dashboard header

Olmasi gereken:
- format: `PNG` veya `WEBP`
- arka plan: `transparent`
- oran: `3:1` ile `5:1`
- onerilen export:
  - `1200x300`
  - `1400x350`
  - `1600x400`

Kurallar:
- buyuk bos kenarlik birakma
- glow sahnesi veya blur arka plan kullanma
- logo/wordmark tuvalin buyuk kismini doldursun
- yukseklikten cok yatay okunurluk onemlidir

Yanlis ornek:
- `1536x1024`
- ortada kucuk wordmark
- etrafi bos veya efektli arka plan dolu

Bu tip dosya UI logosu degil, daha cok paylasim gorseli gibi davranir.

### 2. Favicon Asset

Kullanim:
- tarayici sekmesi
- bookmark
- mobile shortcut

Olmasi gereken:
- format: tercihen `PNG`
- oran: `1:1`
- onerilen export:
  - `64x64`
  - `128x128`
  - `256x256`

Kurallar:
- sadece ikon kullan
- yazi kullanma
- cok kucuk olcekte bile secilebilir form kullan

### 3. Open Graph Asset

Kullanim:
- WhatsApp
- Discord
- X
- Telegram
- Slack

Olmasi gereken:
- format: `PNG`, `JPG/JPEG`, `WEBP`
- oran: `1.91:1`
- onerilen export:
  - `1200x630`

Kurallar:
- burada arka plan ve sahne kullanabilirsin
- slogan veya ek tipografi olabilir
- logo ile birlikte kampanya/oyun mesaji tasiyabilir

Bu asset sosyal paylasim karti icindir. UI logo dosyasi yerine kullanilmamalidir.

## Hizli Kontrol Listesi

### Logo Yuklemeden Once
- arka plan seffaf mi
- gereksiz bosluklar temiz mi
- oran yatay mi
- wordmark gercekten buyuk mu

### Favicon Yuklemeden Once
- kare mi
- sadece ikon mu
- 16-32 px'e dustugunde seciliyor mu

### OG Yuklemeden Once
- `1200x630` veya cok yakin mi
- paylasim kartinda okunur mu
- logo ve baslik guclu kontrastla duruyor mu

## Operasyon Notu

Bir dosya su ozellikleri tasiyorsa `logo` olarak yuklenmemelidir:
- arka planli sahne
- ortada kucuk kompozisyon
- buyuk blur/gradyan alan
- poster veya hero artwork hissi

Bu tip dosyalar `og image` olarak daha dogrudur.
