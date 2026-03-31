# Economy Abuse Hardening Guide

Bu rehber `feature/economy-abuse-hardening` branch'inin uygulama sinirlarini tanimlar.

Amac:

- odul ekonomisini daha guvenli hale getirmek
- abuse'u pahali, verimsiz ve izlenebilir hale getirmek
- normal oyuncuyu yanlis pozitif ile cezalandirmamak

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

## Uygulama Sirasi

1. mevcut reward / coin yazim noktalarini cikar
2. eligibility kurallarini merkezi hale getir
3. cap ve diminishing returns kur
4. suphe skoru ve audit event'lerini ekle
5. admin review tarafi icin minimum gorunurluk sagla

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
