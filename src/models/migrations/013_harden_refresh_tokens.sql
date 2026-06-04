CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS token_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS family_id UUID,
  ADD COLUMN IF NOT EXISTS replaced_by_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;

UPDATE refresh_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex'),
    family_id = gen_random_uuid()
WHERE token_hash IS NULL;

DELETE FROM refresh_tokens older
USING refresh_tokens newer
WHERE older.token_hash = newer.token_hash
  AND older.id < newer.id;

ALTER TABLE refresh_tokens
  ALTER COLUMN token_hash SET NOT NULL,
  ALTER COLUMN family_id SET NOT NULL;

DROP INDEX IF EXISTS idx_refresh_token;
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_family ON refresh_tokens(family_id);

ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS token;
