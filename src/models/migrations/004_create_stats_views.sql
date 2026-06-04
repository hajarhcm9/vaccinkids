-- Day 17: Create statistics views (fixed)
-- Run: docker exec -i vaccinikids-db psql -U vaccinikids_user -d vaccinikids < migrations/003_create_stats_views.sql

DROP VIEW IF EXISTS v_session_remplissage CASCADE;
DROP VIEW IF EXISTS v_couverture_vaccinale CASCADE;
DROP VIEW IF EXISTS v_absenteisme CASCADE;

CREATE VIEW v_session_remplissage AS
SELECT s.id,
       c.nom AS centre_nom,
       v.nom AS vaccin_nom,
       s.date_session,
       s.max_inscriptions,
       (SELECT COUNT(*) FROM rendez_vous rdv
        WHERE rdv.session_id = s.id AND rdv.statut NOT IN ('ANNULE')) AS nb_inscrits,
       ROUND(
         (SELECT COUNT(*)::numeric FROM rendez_vous rdv
          WHERE rdv.session_id = s.id AND rdv.statut NOT IN ('ANNULE'))
         / s.max_inscriptions * 100, 1
       ) AS taux_remplissage
FROM session s
JOIN centre c ON c.id = s.centre_id
JOIN vaccin v ON v.id = s.vaccin_id;

CREATE VIEW v_couverture_vaccinale AS
SELECT vv.id AS vaccin_id,
       vv.nom AS vaccin_nom,
       (SELECT COUNT(*) FROM bebe) AS nb_enfants_cibles,
       COUNT(DISTINCT rdv.bebe_id) AS nb_enfants_vaccines,
       ROUND(
         COUNT(DISTINCT rdv.bebe_id)::numeric
         / NULLIF((SELECT COUNT(*) FROM bebe), 0) * 100, 1
       ) AS taux_couverture
FROM vaccin vv
LEFT JOIN session s ON s.vaccin_id = vv.id
LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
     AND rdv.statut NOT IN ('ANNULE')
LEFT JOIN vaccination vac ON vac.rendez_vous_id = rdv.id
WHERE vv.est_actif = TRUE
GROUP BY vv.id, vv.nom;

CREATE VIEW v_absenteisme AS
SELECT TO_CHAR(s.date_session, 'YYYY-MM') AS mois,
       COUNT(*) AS nb_rdvs,
       SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absents,
       ROUND(
         SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
         / NULLIF(COUNT(*), 0) * 100, 1
       ) AS taux_absenteisme
FROM rendez_vous rdv
JOIN session s ON s.id = rdv.session_id
WHERE rdv.statut IN ('PRESENT', 'ABSENT', 'CONFIRME')
GROUP BY TO_CHAR(s.date_session, 'YYYY-MM')
ORDER BY mois DESC;
