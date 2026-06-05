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

DROP TRIGGER IF EXISTS audit_log_append_only ON audit_log;
UPDATE audit_log
SET
  new_values = COALESCE(new_values, '{}'::jsonb) || jsonb_build_object('legacy_action', action),
  action = CASE
    WHEN action LIKE 'GET__api_exports%' THEN 'EXPORT'
    WHEN action LIKE 'GET__%' THEN 'READ'
    WHEN action LIKE 'POST__%' THEN 'INSERT'
    WHEN action LIKE 'PATCH__%' OR action LIKE 'PUT__%' THEN 'UPDATE'
    WHEN action LIKE 'DELETE__%' THEN 'DELETE'
    ELSE 'UPDATE'
  END
WHERE action NOT IN ('INSERT', 'UPDATE', 'DELETE', 'READ', 'EXPORT');
CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'READ', 'EXPORT'));
