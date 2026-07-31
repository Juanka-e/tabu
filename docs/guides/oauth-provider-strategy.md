# OAuth Provider Strategy

## Karar

- Google login faydali fakat web public acilis blocker'i degil.
- Apple login native iOS/App Store plani aktif olana kadar ertelenir.
- Credentials login ve email verification mevcut haliyle korunur.
- OAuth girisi marketing email izni anlamina gelmez.

Oyunun guest-first yapisi nedeniyle OAuth olmadan da hizli oda katilimi vardir.
Erken OAuth; hesap linking, username onboarding, provider outage, email
collision, silme/export ve destek yukunu acilistan once gereksiz buyutur.

## Email Verification

OAuth-only hesapta provider token'i server-side dogrulanmis ve provider acikca
`email_verified=true` benzeri guvenilir bir claim vermisse ikinci bir Hushle
verification maili zorunlu degildir. Bu durumda `emailVerifiedAt` provider
dogrulamasindan uretilir.

Provider email vermiyorsa veya dogrulanmislik sinyali yoksa hesap otomatik
verified sayilmaz. Credentials ile acilan hesaplar admin paneldeki mevcut email
verification politikasina uymaya devam eder.

## Account Linking

- yalniz email eslesmesine bakarak sessiz hesap birlestirme yapilmaz
- mevcut kullanici login durumundayken acik bir "hesap bagla" adimi onerilir
- provider `subject` kimligi kalici anahtar olarak saklanir
- provider degistirmek `userId`, wallet, inventory veya audit kimligini degistirmez
- collision durumunda yeni hesap acmak yerine guvenli recovery/support akisi gerekir

Mevcut semada OAuth `Account` modeli yoktur ve `User.password` zorunludur.
Implementasyon; nullable/ayri credential modeli, provider account tablosu,
unique provider subject, username secim adimi ve migration gerektirir.

## Uygulama Sirasi

1. production email/Turnstile ve temel web acilisi stabil olsun
2. Google provider'i staging'de ekle
3. yeni OAuth kullanicisina benzersiz username/display name onboarding uygula
4. mevcut credentials hesabi icin explicit account-linking uygula
5. duplicate/collision, revoke ve provider outage E2E testlerini tamamla
6. native iOS plani netlesince Apple Services ID/private key ve relay mail
   operasyonunu ayri branch'te ekle

Apple kullanicisi emailini gizleyebilir. Relay adrese transactional mail
gonderilecekse outbound domain ve sender Apple Private Email Relay tarafinda
ayrica yapilandirilmalidir.
