-- Allow CIN+password registration (telephone no longer required)
ALTER TABLE parent
  ALTER COLUMN telephone DROP NOT NULL;

-- Replace the old UNIQUE constraint (which rejects multiple NULLs on some engines)
-- with a partial unique index that only enforces uniqueness on non-NULL values
ALTER TABLE parent DROP CONSTRAINT IF EXISTS parent_telephone_key;
DROP INDEX IF EXISTS idx_parent_telephone;
CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_telephone_unique
  ON parent(telephone) WHERE telephone IS NOT NULL;

-- Password column for CIN+password login
ALTER TABLE parent
  ADD COLUMN IF NOT EXISTS mot_de_passe TEXT;
