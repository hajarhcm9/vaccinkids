ALTER TABLE stock_movement DROP CONSTRAINT IF EXISTS stock_movement_type_check;

ALTER TABLE stock_movement
  ADD CONSTRAINT stock_movement_type_check
  CHECK (type IN ('UPSERT', 'ADJUSTMENT', 'THRESHOLD', 'VIAL_OPEN'));

