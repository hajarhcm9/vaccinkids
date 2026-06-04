-- Limit OTP brute-force attempts for existing databases.

ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE otp_codes
  DROP CONSTRAINT IF EXISTS otp_codes_failed_attempts_check;

ALTER TABLE otp_codes
  ADD CONSTRAINT otp_codes_failed_attempts_check CHECK (failed_attempts >= 0);
