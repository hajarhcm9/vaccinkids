-- Add the parent email used by notification and document delivery flows.

ALTER TABLE parent
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);
