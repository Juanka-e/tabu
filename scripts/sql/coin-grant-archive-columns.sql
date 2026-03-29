ALTER TABLE `coin_grant_campaigns`
    ADD COLUMN IF NOT EXISTS `archived_at` DATETIME(3) NULL;

ALTER TABLE `coin_grant_codes`
    ADD COLUMN IF NOT EXISTS `archived_at` DATETIME(3) NULL;
