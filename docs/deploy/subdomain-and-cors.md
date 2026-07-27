# Admin Subdomain And CORS

Kisa cevap:

- Su anki yapida `/admin` ayni origin uzerinde en sorunsuz secenek.
- `admin.hushle.com` gibi ayri subdomain de yapilabilir ama "hicbir seye dokunmadan istedigim an gecerim" seviyesinde degil.

Neden:

1. proje production tarafinda `NEXT_PUBLIC_SITE_URL` uzerinden tek canonical origin varsayiyor
2. Socket.IO server production origin kontrolunu bu degerle yapiyor
3. auth/cookie/callback davranislarini subdomain senaryosunda tekrar gozden gecirmek gerekir

Bu ne anlama geliyor:

- `/admin` ayni domainde kalirsa CORS sorunu cikarma olasiligi en dusuk
- subdomain'e gecmek istersek kucuk bir host/origin/cookie gecisi yapariz

Subdomain'e gecerken kontrol listesi:

1. `NEXTAUTH_URL`
2. `NEXT_PUBLIC_SITE_URL`
3. Socket.IO production origin allowlist
4. cookie domain ihtiyaci
5. Cloudflare Access scope

## Gelecekte Cift Host Desteği Gerekirse

Hem:

1. `/admin`
2. `admin.hushle.com`

uzun sure bir arada desteklenecekse acik bir migration listesiyle ilerlemeliyiz:

1. host allowlist
2. auth callback URL listesi
3. cookie domain ve same-site davranisi
4. Socket.IO trusted origin allowlist
5. canonical URL karari
6. Cloudflare Access policy kapsamlarinin ayrimi

Bu is gelecek is listesinde durmali; "sonradan bakariz" seviyesinde bir konu degil.

Onerim:

1. kisa vadede `/admin`
2. Cloudflare Access ile path korumasi
3. ileride ihtiyac olursa `admin.hushle.com`

Bu daha dusuk operasyonel risklidir.

## Baska Containerlar Olursa

Sorun olmaz, yeter ki:

1. sadece Nginx `80/443` acsin
2. baska container'lar private networkte kalsin
3. host bazli veya path bazli reverse proxy kuralin net olsun

Ornek:

- `hushle.com` -> app
- `grafana.hushle.com` -> grafana container
- `admin.hushle.com` -> ayni app veya ayri admin origin
