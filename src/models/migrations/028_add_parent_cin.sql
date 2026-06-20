-- Add CIN to parent table for direct login (no OTP).
-- Also adds is_new_user flag to replace fragile nom='Nouveau' check.

ALTER TABLE parent
  ADD COLUMN IF NOT EXISTS cin VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_new_user BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_cin ON parent(cin) WHERE cin IS NOT NULL;
