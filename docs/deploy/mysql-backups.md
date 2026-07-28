# MySQL Backups

Uygulanan yapi:

1. `scripts/ops/mysql-backup.sh`
2. `scripts/ops/mysql-restore.sh`
3. `scripts/ops/mysql-backup.cron.example`
4. `scripts/ops/object-storage.sh`
5. `scripts/ops/mysql-restore-smoke.sh`
6. `docker-compose.ops.yml`

Backup mantigi:

- `mysqldump --single-transaction --quick --routines --triggers`
- gzip sikistirma
- her dump icin tasinabilir SHA-256 checksum
- varsayilan 7 gun local retention
- opsiyonel S3-compatible offsite upload ve remote size dogrulamasi

Elle backup:

```bash
./scripts/ops/mysql-backup.sh
```

Elle local restore:

```bash
./scripts/ops/mysql-restore.sh \
  backups/mysql/hushle-mysql-YYYYMMDDTHHMMSSZ.sql.gz
```

Remote restore:

```bash
./scripts/ops/mysql-restore.sh \
  s3://bucket-name/production/mysql/hushle-mysql-YYYYMMDDTHHMMSSZ.sql.gz
```

Restore varsayilan olarak ayni dizindeki `.sha256` dosyasini zorunlu tutar.
Eski bir backup'i kontrollu olarak restore etmek gerekirse yalniz o komut icin
`BACKUP_REQUIRE_CHECKSUM=false` verilebilir.

Haftalik, gecici veritabanina restore smoke testi:

```bash
./scripts/ops/mysql-restore-smoke.sh \
  backups/mysql/hushle-mysql-YYYYMMDDTHHMMSSZ.sql.gz
```

Smoke scripti benzersiz bir test veritabani olusturur, restore edilen tablo
sayisini kontrol eder ve basarili/basarisiz her cikista test veritabanini siler.
Production veritabaninin adini hedef olarak kullanmaz.

## Offsite Object Storage

Amazon tarafindaki urunun adi `Amazon S3`'tur. Cloudflare R2, Backblaze B2 ve
benzeri servisler S3-compatible API sunar. Ops scriptleri tek saglayiciya
baglanmaz.

Uygulanan sinir:

1. `mysql-backup.sh` local `.sql.gz` dosyasini olusturmaya devam eder.
2. Dump icin SHA-256 checksum uretilir.
3. Dump ve checksum private S3-compatible bucket'a yuklenir.
4. Her upload remote object size ile dogrulanir.
5. Remote restore checksum dosyasini da indirir.
6. Checksum dogrulanmadan MySQL restore baslamaz.
7. Haftalik smoke ayri bir gecici veritabaninda calisir.

Saglayicidan bagimsiz ops env kontrati:

- `BACKUP_REMOTE_ENABLED`
- `BACKUP_S3_ENDPOINT`
- `BACKUP_S3_REGION`
- `BACKUP_S3_BUCKET`
- `BACKUP_S3_PREFIX`
- `BACKUP_S3_ACCESS_KEY_ID`
- `BACKUP_S3_SECRET_ACCESS_KEY`
- `BACKUP_S3_CLI_MODE`
- `BACKUP_AWS_CLI_IMAGE`
- `BACKUP_REMOTE_RETENTION_DAYS`

R2 ornegi:

```env
BACKUP_REMOTE_ENABLED=true
BACKUP_S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
BACKUP_S3_REGION=auto
BACKUP_S3_BUCKET=hushle-backups
BACKUP_S3_PREFIX=production
BACKUP_S3_ACCESS_KEY_ID=...
BACKUP_S3_SECRET_ACCESS_KEY=...
BACKUP_S3_CLI_MODE=docker
BACKUP_AWS_CLI_IMAGE=public.ecr.aws/aws-cli/aws-cli:2.36.10
BACKUP_REMOTE_RETENTION_DAYS=30
```

Amazon S3 kullanirken `BACKUP_S3_ENDPOINT` bos, region ise bucket region'i
olmalidir. R2 kullanirken account endpoint'i ve `auto` region kullanilir.

Bu secret'lar Next.js `app` veya `jobs` container'ina verilmez. Yalniz
`docker-compose.ops.yml` icindeki `backup-cli` servisine aktarilir. Hostta
AWS-compatible CLI kuruluysa `BACKUP_S3_CLI_MODE=host` da kullanilabilir.
Ops container host kullanicisinin UID/GID degerleriyle calisir; indirdigi
backup dosyalarini root-owned birakmaz. Resmi AWS ECR Public image'i immutable
bir tam surume pinlidir; surum guncellemesi testlerden sonra bilincli yapilir.

Guvenlik ve retention:

- bucket public access tamamen kapali
- credentials yalniz belirlenen backup prefix'i icin minimum yetkili
- transit sifreleme TLS; provider-side at-rest encryption zorunlu
- local kopya varsayilan 7 gun
- remote gunluk kopya ilk asamada 30 gun
- remote silme scriptle degil provider lifecycle policy ile yonetilir
- `BACKUP_REMOTE_RETENTION_DAYS` lifecycle icin operasyonel kontrattir
- backup yazma kimligine remote delete yetkisi verilmez
- kritik production icin versioning ve mumkunse Object Lock degerlendirilir

Offsite icin uygun adaylar:

1. Cloudflare R2
2. Amazon S3
3. Backblaze B2

Erken asamada R2 genellikle basit ve dusuk egress maliyetli secenektir. AWS
altyapisi zaten kullaniliyorsa S3 daha dogal secimdir. Ayni scriptler iki
hedefte de S3-compatible kontrati kullanir.
