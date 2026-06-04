-- Add account lock fields used by brute-force protection to existing databases.

ALTER TABLE personnel
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE personnel
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

ALTER TABLE personnel
  DROP CONSTRAINT IF EXISTS personnel_failed_login_attempts_check;

ALTER TABLE personnel
  ADD CONSTRAINT personnel_failed_login_attempts_check CHECK (failed_login_attempts >= 0);
