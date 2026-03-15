ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL AFTER read_at;

CREATE INDEX idx_notifications_user_read_archived_created
ON notifications (user_id, is_read, archived_at, created_at);
