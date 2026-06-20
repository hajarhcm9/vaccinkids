-- Flag for newborns without official identity documents.
-- prenom/nom become nullable to allow "Nouveau-né" placeholder flow.

ALTER TABLE bebe
  ADD COLUMN IF NOT EXISTS is_newborn BOOLEAN NOT NULL DEFAULT FALSE,
  ALTER COLUMN prenom DROP NOT NULL,
  ALTER COLUMN nom    DROP NOT NULL;

-- Default empty to empty string if existing NULLs (shouldn't exist but safe)
UPDATE bebe SET prenom = 'Inconnu' WHERE prenom IS NULL;
UPDATE bebe SET nom    = 'Inconnu' WHERE nom    IS NULL;
