ALTER TABLE vaccin
  ADD COLUMN IF NOT EXISTS est_naissance BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark birth vaccines by keyword (admin can adjust later via web panel)
UPDATE vaccin
SET est_naissance = TRUE
WHERE nom ILIKE '%BCG%'
   OR nom ILIKE '%Hépatite%'
   OR nom ILIKE '%Hepatite%'
   OR nom ILIKE '%HB%'
   OR nom ILIKE '%VHB%'
   OR nom ILIKE '%VHEP%';
