-- Migration 033: Add date_expiration to stock table
ALTER TABLE stock ADD COLUMN IF NOT EXISTS date_expiration DATE;

COMMENT ON COLUMN stock.date_expiration IS 'Date d''expiration du lot courant (optionnel)';
