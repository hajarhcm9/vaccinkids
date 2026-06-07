ALTER TABLE flacon
  ADD COLUMN IF NOT EXISTS date_fermeture TIMESTAMP,
  ADD COLUMN IF NOT EXISTS justification_fermeture TEXT;

CREATE INDEX IF NOT EXISTS idx_flacon_session_open
  ON flacon(session_id)
  WHERE date_fermeture IS NULL;
