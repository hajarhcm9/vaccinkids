-- Each centre maintains its own baby registration sequence.
-- bebe.numero_centre = the number in the centre's physical register book.
-- bebe.id remains the internal DB key (never shown to users).

-- Counter on the centre itself — atomic increment with UPDATE ... RETURNING
ALTER TABLE centre
  ADD COLUMN IF NOT EXISTS bebe_counter INTEGER NOT NULL DEFAULT 0;

-- The registration number, unique within a centre
ALTER TABLE bebe
  ADD COLUMN IF NOT EXISTS numero_centre INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bebe_numero_centre
  ON bebe(centre_id, numero_centre)
  WHERE centre_id IS NOT NULL AND numero_centre IS NOT NULL;
