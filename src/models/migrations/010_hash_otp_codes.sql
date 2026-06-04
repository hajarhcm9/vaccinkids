-- Replace recoverable OTP codes with keyed hashes.
-- Existing active codes cannot be converted without knowing the server secret,
-- so they are invalidated and users must request a new code.

ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS code_hash CHAR(64);

UPDATE otp_codes
SET code_hash = repeat('0', 64),
    est_verifie = TRUE
WHERE code_hash IS NULL;

ALTER TABLE otp_codes
  ALTER COLUMN code_hash SET NOT NULL;

ALTER TABLE otp_codes
  DROP COLUMN IF EXISTS code;
