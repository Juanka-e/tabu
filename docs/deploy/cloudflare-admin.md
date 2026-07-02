# Cloudflare Admin Protection

Admin korumasi icin oncelik sirasi:

1. Cloudflare Access
2. Turnstile
3. Browser Integrity Check
4. gerekiyorsa kisitli WAF/rate-limit kurali
5. acil durumda gecici Under Attack mode

En guclu katman:

- admin path veya admin subdomain onunde Cloudflare Access

Neden:

- sadece IP kuralina bagli kalmazsin
- MFA/IdP katmani gelir
- bot taramasi admin login ekranina kolayca inmez

Pratik kurallar:

1. `/admin*`
2. `/api/admin*`

icin Access policy tanimlanabilir.

Turnstile nerede:

1. register
2. login
3. kritik form submitleri

Not:

- `Under Attack` kalici mod olmamali
- esas koruma kimlik katmanidir
