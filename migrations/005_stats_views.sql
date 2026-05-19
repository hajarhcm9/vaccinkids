-- Day 19: Statistics & Dashboard (fixed)

-- View: Session fill rate summary
CREATE OR REPLACE VIEW v_stats_sessions AS
SELECT
  s.id AS session_id,
  s.date_session,
  s.heure_debut,
  s.heure_fin,
  s.statut AS session_statut,
  s.max_inscriptions,
  v.nom AS vaccin_nom,
  c.id AS centre_id,
  c.nom AS centre_nom,
  COUNT(rdv.id) AS nb_inscrits,
  SUM(CASE WHEN rdv.statut = 'PRESENT' THEN 1 ELSE 0 END) AS nb_presents,
  SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absents,
  SUM(CASE WHEN rdv.statut = 'EN_ATTENTE' THEN 1 ELSE 0 END) AS nb_en_attente,
  SUM(CASE WHEN rdv.statut = 'EN_LISTE_ATTENTE' THEN 1 ELSE 0 END) AS nb_liste_attente,
  ROUND(
    COUNT(rdv.id)::numeric / NULLIF(s.max_inscriptions, 0) * 100, 1
  ) AS taux_remplissage
FROM session s
JOIN vaccin v ON v.id = s.vaccin_id
JOIN centre c ON c.id = s.centre_id
LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
GROUP BY s.id, s.date_session, s.heure_debut, s.heure_fin, s.statut,
        s.max_inscriptions, v.nom, c.id, c.nom;

-- View: Monthly summary statistics
CREATE OR REPLACE VIEW v_stats_mensuelles AS
SELECT
  TO_CHAR(s.date_session, 'YYYY-MM') AS mois,
  s.centre_id,
  c.nom AS centre_nom,
  COUNT(DISTINCT s.id) AS nb_sessions,
  COUNT(DISTINCT rdv.id) AS nb_rdvs,
  SUM(CASE WHEN rdv.statut = 'PRESENT' THEN 1 ELSE 0 END) AS nb_presents,
  SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absents,
  COUNT(DISTINCT vac.id) AS nb_vaccinations,
  ROUND(
    SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
    / NULLIF(COUNT(DISTINCT rdv.id), 0) * 100, 1
  ) AS taux_absenteisme
FROM session s
JOIN centre c ON c.id = s.centre_id
LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
LEFT JOIN vaccination vac ON vac.rendez_vous_id = rdv.id
GROUP BY TO_CHAR(s.date_session, 'YYYY-MM'), s.centre_id, c.nom
ORDER BY mois DESC;

-- View: Vaccine coverage per vaccine
CREATE OR REPLACE VIEW v_stats_couverture AS
SELECT
  v.id AS vaccin_id,
  v.nom AS vaccin_nom,
  v.age_cible_semaines,
  COUNT(DISTINCT b.id) AS total_bebes_eligibles,
  COUNT(DISTINCT rdv_vacc.bebe_id) AS bebes_vaccines,
  ROUND(
    COUNT(DISTINCT rdv_vacc.bebe_id)::numeric
    / NULLIF(COUNT(DISTINCT b.id), 0) * 100, 1
  ) AS taux_couverture
FROM vaccin v
CROSS JOIN bebe b
LEFT JOIN (
  SELECT DISTINCT rdv.bebe_id, s.vaccin_id
  FROM vaccination vac
  JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
  JOIN session s ON s.id = rdv.session_id
) rdv_vacc ON rdv_vacc.bebe_id = b.id AND rdv_vacc.vaccin_id = v.id
WHERE v.est_actif = TRUE
  AND (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week')) <= CURRENT_DATE
GROUP BY v.id, v.nom, v.age_cible_semaines
ORDER BY v.age_cible_semaines;
