-- Development/test fixtures only. Never run this seed in production.

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
