-- Attach every parent and baby to exactly one centre.
-- A baby's registration number is centre-scoped; the same DB id at two centres = two different people.

ALTER TABLE parent
  ADD COLUMN IF NOT EXISTS centre_id INTEGER REFERENCES centre(id);

ALTER TABLE bebe
  ADD COLUMN IF NOT EXISTS centre_id INTEGER REFERENCES centre(id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_parent_centre ON parent(centre_id);
CREATE INDEX IF NOT EXISTS idx_bebe_centre   ON bebe(centre_id);
