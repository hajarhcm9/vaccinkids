-- Development/test fixtures only. Never run this seed in production.

INSERT INTO centre (id, nom, adresse, telephone, gps_lat, gps_lng, est_actif)
VALUES (1, 'Centre de Santé Es-Salaam', 'Province d''Oujda, Maroc', '+212536000000', 34.6814000, -1.9086000, TRUE)
ON CONFLICT (id) DO UPDATE SET est_actif = TRUE;

INSERT INTO vaccin (id, nom, doses_par_flacon, age_cible_semaines, maladies_ciblees, est_actif) VALUES
  (1, 'BCG', 10, 0, 'Tuberculose', TRUE),
  (2, 'Hépatite B', 1, 0, 'Hépatite B', TRUE),
  (3, 'Pentavalent', 1, 8, 'Diphtérie, Tétanos, Coqueluche, Hépatite B, Hib', TRUE),
  (4, 'Polio (VPI)', 1, 8, 'Poliomyélite', TRUE),
  (5, 'Pneumocoque', 1, 8, 'Infections pneumococciques', TRUE),
  (6, 'Rotavirus', 1, 8, 'Gastroentérite à rotavirus', TRUE),
  (7, 'ROR', 1, 52, 'Rougeole, Oreillons, Rubéole', TRUE),
  (8, 'Méningocoque', 1, 52, 'Méningite à méningocoque', TRUE),
  (9, 'DTC', 1, 78, 'Diphtérie, Tétanos, Coqueluche (rappel)', TRUE),
  (10, 'Polio (rappel)', 1, 78, 'Poliomyélite (rappel)', TRUE)
ON CONFLICT (id) DO UPDATE SET est_actif = TRUE;

SELECT setval(pg_get_serial_sequence('centre', 'id'), (SELECT MAX(id) FROM centre), TRUE);
SELECT setval(pg_get_serial_sequence('vaccin', 'id'), (SELECT MAX(id) FROM vaccin), TRUE);

INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
VALUES
  ('ADMIN01', 'Admin', 'VacciniKids', '$2b$10$oH8EUOE2q/7c.vwcKYV.juZAj0FgP1ettumk2JjF3b5/urltlUrSG', 'admin', 1, TRUE),
  ('INFIRM01', 'Benali', 'Fatima', '$2b$10$A47cvmwRLHKaR3SK633N5urvtK0YoQzDZczsMfcgSi4WX.rV.oXja', 'infirmier', 1, TRUE)
ON CONFLICT (cin) DO UPDATE SET
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  mot_de_passe = EXCLUDED.mot_de_passe,
  role = EXCLUDED.role,
  centre_id = EXCLUDED.centre_id,
  est_actif = EXCLUDED.est_actif;

INSERT INTO stock (centre_id, vaccin_id, quantite_disponible, seuil_alerte)
VALUES
  (1, 1, 50, 10), (1, 2, 30, 5), (1, 3, 40, 8), (1, 4, 40, 8),
  (1, 5, 25, 5), (1, 6, 20, 5), (1, 7, 30, 5), (1, 8, 15, 3),
  (1, 9, 25, 5), (1, 10, 25, 5)
ON CONFLICT (centre_id, vaccin_id) DO NOTHING;
