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

Offsite icin uygun adaylar:

1. Cloudflare R2
2. Backblaze B2
3. S3-compatible bucket
