-- Day 18: Absenteeism Management + Delay Alerts (FIXED)
-- Run: docker exec -i vaccinikids-db psql -U vaccinikids_user -d vaccinikids < migrations/004_absenteeism_delay_alerts.sql

-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS trg_reset_absences_on_presence ON rendez_vous;
DROP FUNCTION IF EXISTS auto_mark_absents_for_session CASCADE;
DROP FUNCTION IF EXISTS get_delayed_vaccines_for_bebe CASCADE;
DROP FUNCTION IF EXISTS reset_parent_absences_on_presence CASCADE;
DROP VIEW IF EXISTS v_retards_vaccinaux CASCADE;

-- Function: auto_mark_absents_for_session
CREATE OR REPLACE FUNCTION auto_mark_absents_for_session(
  p_session_id INTEGER,
  p_grace_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(rdv_id INTEGER, parent_id INTEGER, was_promoted BOOLEAN) AS $$
DECLARE
  v_session_statut VARCHAR;
  v_session_start TIMESTAMP;
  v_elapsed_minutes NUMERIC;
  v_rdv RECORD;
  v_promoted_id INTEGER;
BEGIN
  SELECT statut, (date_session::timestamp + heure_debut::interval) INTO v_session_statut, v_session_start
  FROM session WHERE id = p_session_id;

  IF v_session_statut IS NULL THEN
    RAISE EXCEPTION 'Session % not found', p_session_id;
  END IF;

  IF v_session_statut != 'EN_COURS' THEN
    RAISE EXCEPTION 'Session % is not EN_COURS (current: %)', p_session_id, v_session_statut;
  END IF;

  v_elapsed_minutes := EXTRACT(EPOCH FROM (NOW() - v_session_start)) / 60;
  IF v_elapsed_minutes < p_grace_minutes THEN
    RAISE EXCEPTION 'Grace period not elapsed (% minutes remaining)', p_grace_minutes - v_elapsed_minutes;
  END IF;

  FOR v_rdv IN
    SELECT id, parent_id FROM rendez_vous
    WHERE session_id = p_session_id AND statut IN ('CONFIRME', 'EN_ATTENTE')
  LOOP
    UPDATE rendez_vous SET statut = 'ABSENT', updated_at = NOW() WHERE id = v_rdv.id;
    UPDATE parent SET nb_absences_consecutives = nb_absences_consecutives + 1, updated_at = NOW()
    WHERE id = v_rdv.parent_id;

    SELECT id INTO v_promoted_id FROM rendez_vous
    WHERE session_id = p_session_id AND statut = 'EN_LISTE_ATTENTE'
    ORDER BY date_creation ASC LIMIT 1;

    IF v_promoted_id IS NOT NULL THEN
      UPDATE rendez_vous SET statut = 'EN_ATTENTE', updated_at = NOW() WHERE id = v_promoted_id;
    END IF;

    rdv_id := v_rdv.id;
    parent_id := v_rdv.parent_id;
    was_promoted := v_promoted_id IS NOT NULL;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function: get_delayed_vaccines_for_bebe
CREATE OR REPLACE FUNCTION get_delayed_vaccines_for_bebe(p_bebe_id INTEGER)
RETURNS TABLE(
  vaccin_id INTEGER,
  vaccin_nom VARCHAR,
  age_cible_semaines INTEGER,
  date_prevue DATE,
  jours_retard INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.nom,
    v.age_cible_semaines,
    (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week'))::DATE AS date_prevue,
    (EXTRACT(EPOCH FROM (CURRENT_DATE - (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week')))) / 86400)::INTEGER AS jours_retard
  FROM bebe b
  CROSS JOIN vaccin v
  WHERE b.id = p_bebe_id
    AND v.est_actif = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM vaccination vac
      JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
      JOIN session s ON s.id = rdv.session_id
      WHERE rdv.bebe_id = b.id AND s.vaccin_id = v.id
    )
    AND CURRENT_DATE > (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week') + INTERVAL '7 days')
  ORDER BY jours_retard DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: reset_parent_absences_on_presence
CREATE OR REPLACE FUNCTION reset_parent_absences_on_presence()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'PRESENT' AND OLD.statut != 'PRESENT' THEN
    UPDATE parent SET nb_absences_consecutives = 0, updated_at = NOW()
    WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trg_reset_absences_on_presence
  AFTER UPDATE ON rendez_vous
  FOR EACH ROW
  EXECUTE FUNCTION reset_parent_absences_on_presence();

-- View: delayed vaccines summary per centre (FIXED - no interval::numeric)
CREATE VIEW v_retards_vaccinaux AS
SELECT
  c.id AS centre_id,
  c.nom AS centre_nom,
  v.id AS vaccin_id,
  v.nom AS vaccin_nom,
  COUNT(DISTINCT b.id) AS nb_enfants_retard,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (CURRENT_DATE - (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week')))) / 86400
  ))::integer AS avg_jours_retard,
  (MAX(
    EXTRACT(EPOCH FROM (CURRENT_DATE - (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week')))) / 86400
  ))::integer AS max_jours_retard
FROM bebe b
CROSS JOIN vaccin v
JOIN rendez_vous rdv2 ON rdv2.bebe_id = b.id
JOIN session s2 ON s2.id = rdv2.session_id
JOIN centre c ON c.id = s2.centre_id
WHERE v.est_actif = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM vaccination vac
    JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
    JOIN session s ON s.id = rdv.session_id
    WHERE rdv.bebe_id = b.id AND s.vaccin_id = v.id
  )
  AND CURRENT_DATE > (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week') + INTERVAL '7 days')
GROUP BY c.id, c.nom, v.id, v.nom
ORDER BY nb_enfants_retard DESC;
