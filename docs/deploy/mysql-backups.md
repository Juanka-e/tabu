# MySQL Backups

Uygulanan hafif yapi:

1. `scripts/ops/mysql-backup.sh`
2. `scripts/ops/mysql-restore.sh`
3. `scripts/ops/mysql-backup.cron.example`

Backup mantigi:

- `mysqldump --single-transaction --quick --routines --triggers`
- `gzip`
- varsayilan 7 gun retention

Elle backup:

```bash
./scripts/ops/mysql-backup.sh
```

Elle restore:

```bash
./scripts/ops/mysql-restore.sh backups/mysql/hushle-mysql-YYYYMMDDTHHMMSSZ.sql.gz
```

Oneri:

1. gunluk cron local backup
2. sonraki asamada offsite kopya
3. haftalik restore testi

## Offsite Hedefi

Amazon tarafindaki urunun adi `Amazon S3`'tur. Cloudflare R2, Backblaze B2 ve
benzeri servisler S3-compatible API sunabilir. Uygulama tek saglayiciya
baglanmamalidir.

Planlanan branch:

- `feature/offsite-backup-object-storage`

Bu branch'te uygulanacak sinir:

1. `mysql-backup.sh` local `.sql.gz` dosyasini olusturmaya devam eder.
2. Dump icin SHA-256 checksum uretilir.
3. Ops katmani dump ve checksum dosyasini private S3-compatible bucket'a yukler.
4. Upload dogrulanmadan local backup basarili kabul edilmez.
5. Restore scripti remote dosyayi indirir, checksum'i dogrular ve ancak sonra
   MySQL restore'a izin verir.
6. Haftalik otomatik restore smoke testi ayri bir test veritabaninda calisir.

Saglayicidan bagimsiz ops env kontrati:

- `BACKUP_S3_ENDPOINT`
- `BACKUP_S3_REGION`
- `BACKUP_S3_BUCKET`
- `BACKUP_S3_PREFIX`
- `BACKUP_S3_ACCESS_KEY_ID`
- `BACKUP_S3_SECRET_ACCESS_KEY`
- `BACKUP_REMOTE_RETENTION_DAYS`

Bu secret'lar Next.js `app` container'ina verilmez. Yalniz backup/restore
scriptinin calistigi ops ortamina konur.

Guvenlik ve retention:

- bucket public access tamamen kapali
- credentials yalniz belirlenen backup prefix'i icin minimum yetkili
- transit sifreleme TLS; provider-side at-rest encryption zorunlu
- local kopya varsayilan 7 gun
- remote gunluk kopya ilk asamada 30 gun
- haftalik/aylik daha uzun saklama lifecycle policy ile yonetilir
- kritik production icin versioning ve mumkunse Object Lock degerlendirilir
- remote silme yetkisi backup yazma kimliginden ayrilabilir

Offsite icin uygun adaylar:

1. Cloudflare R2
2. Amazon S3
3. Backblaze B2

Erken asamada R2 genellikle basit ve dusuk egress maliyetli secenektir. AWS
altyapisi zaten kullaniliyorsa S3 daha dogal secimdir. Kod ve script her iki
hedefte de ayni S3-compatible kontrati kullanmalidir.
