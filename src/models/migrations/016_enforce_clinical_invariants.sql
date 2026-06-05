DO $$
BEGIN
  IF EXISTS (
    SELECT rendez_vous_id FROM vaccination
    GROUP BY rendez_vous_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one vaccination per appointment: duplicates exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vaccination_rendez_vous
  ON vaccination(rendez_vous_id);

CREATE OR REPLACE FUNCTION enforce_flacon_capacity()
RETURNS TRIGGER AS $$
DECLARE
  capacity INTEGER;
BEGIN
  SELECT doses_par_flacon INTO capacity FROM vaccin WHERE id = NEW.vaccin_id;
  IF NEW.doses_utilisees + NEW.doses_gaspillees > capacity THEN
    RAISE EXCEPTION 'Vial dose capacity exceeded' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_flacon_capacity ON flacon;
CREATE TRIGGER trg_enforce_flacon_capacity
BEFORE INSERT OR UPDATE OF vaccin_id, doses_utilisees, doses_gaspillees ON flacon
FOR EACH ROW EXECUTE FUNCTION enforce_flacon_capacity();

CREATE OR REPLACE FUNCTION prevent_vaccine_capacity_reduction()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM flacon
    WHERE vaccin_id = NEW.id
      AND doses_utilisees + doses_gaspillees > NEW.doses_par_flacon
  ) THEN
    RAISE EXCEPTION 'Vaccine capacity is below doses already consumed by a vial'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_vaccine_capacity_reduction ON vaccin;
CREATE TRIGGER trg_prevent_vaccine_capacity_reduction
BEFORE UPDATE OF doses_par_flacon ON vaccin
FOR EACH ROW EXECUTE FUNCTION prevent_vaccine_capacity_reduction();

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'READ', 'EXPORT'));
