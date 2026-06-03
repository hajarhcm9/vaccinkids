-- ============================================
-- VacciniKids — Database Migration
-- Creates all tables for the application
-- Author: Asmae — ISPITS Oujda PFE 2025/2026
-- ============================================

-- 1. CENTRE
CREATE TABLE IF NOT EXISTS centre (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  adresse TEXT NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  est_actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERSONNEL
CREATE TABLE IF NOT EXISTS personnel (
  id SERIAL PRIMARY KEY,
  cin VARCHAR(20) UNIQUE NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('infirmier', 'admin')),
  centre_id INTEGER NOT NULL REFERENCES centre(id) ON DELETE RESTRICT,
  est_actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PARENT
CREATE TABLE IF NOT EXISTS parent (
  id SERIAL PRIMARY KEY,
  telephone VARCHAR(20) UNIQUE NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  langue_preferee VARCHAR(5) NOT NULL DEFAULT 'fr' CHECK (langue_preferee IN ('fr', 'ar')),
  fcm_token TEXT,
  nb_absences_consecutives INTEGER NOT NULL DEFAULT 0,
  est_actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BEBE
CREATE TABLE IF NOT EXISTS bebe (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  date_naissance DATE NOT NULL,
  sexe VARCHAR(1) NOT NULL CHECK (sexe IN ('M', 'F')),
  photo_url TEXT,
  code_qr VARCHAR(50) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. VACCIN
CREATE TABLE IF NOT EXISTS vaccin (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  doses_par_flacon INTEGER NOT NULL CHECK (doses_par_flacon > 0),
  age_cible_semaines INTEGER NOT NULL,
  maladies_ciblees TEXT NOT NULL,
  est_actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SESSION
CREATE TABLE IF NOT EXISTS session (
  id SERIAL PRIMARY KEY,
  centre_id INTEGER NOT NULL REFERENCES centre(id) ON DELETE RESTRICT,
  vaccin_id INTEGER NOT NULL REFERENCES vaccin(id) ON DELETE RESTRICT,
  date_session DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'EN_FORMATION'
    CHECK (statut IN ('EN_FORMATION', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE')),
  max_inscriptions INTEGER NOT NULL CHECK (max_inscriptions > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_heure_session CHECK (heure_debut < heure_fin)
);

-- 7. RENDEZ_VOUS
CREATE TABLE IF NOT EXISTS rendez_vous (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  parent_id INTEGER NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  bebe_id INTEGER NOT NULL REFERENCES bebe(id) ON DELETE CASCADE,
  statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE'
    CHECK (statut IN ('EN_ATTENTE', 'CONFIRME', 'PRESENT', 'ABSENT', 'ANNULE', 'EN_LISTE_ATTENTE')),
  numero_attente INTEGER,
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uc_rdv_unique UNIQUE (session_id, bebe_id)
);

-- 8. FLACON (must be before VACCINATION due to foreign key)
CREATE TABLE IF NOT EXISTS flacon (
  id SERIAL PRIMARY KEY,
  vaccin_id INTEGER NOT NULL REFERENCES vaccin(id) ON DELETE RESTRICT,
  session_id INTEGER REFERENCES session(id) ON DELETE SET NULL,
  numero_lot VARCHAR(50) NOT NULL,
  fabricant VARCHAR(100) NOT NULL,
  date_ouverture TIMESTAMP WITH TIME ZONE,
  doses_utilisees INTEGER NOT NULL DEFAULT 0 CHECK (doses_utilisees >= 0),
  doses_gaspillees INTEGER NOT NULL DEFAULT 0 CHECK (doses_gaspillees >= 0),
  ouverture_forcee BOOLEAN NOT NULL DEFAULT FALSE,
  justification_forcee TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. VACCINATION
CREATE TABLE IF NOT EXISTS vaccination (
  id SERIAL PRIMARY KEY,
  rendez_vous_id INTEGER NOT NULL REFERENCES rendez_vous(id) ON DELETE RESTRICT,
  personnel_id INTEGER NOT NULL REFERENCES personnel(id) ON DELETE RESTRICT,
  flacon_id INTEGER REFERENCES flacon(id) ON DELETE SET NULL,
  date_heure TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  poids DECIMAL(5, 2),
  taille DECIMAL(5, 1),
  reactions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. CROISSANCE
CREATE TABLE IF NOT EXISTS croissance (
  id SERIAL PRIMARY KEY,
  bebe_id INTEGER NOT NULL REFERENCES bebe(id) ON DELETE CASCADE,
  date_mesure DATE NOT NULL DEFAULT CURRENT_DATE,
  poids DECIMAL(5, 2) NOT NULL CHECK (poids > 0),
  taille DECIMAL(5, 1) NOT NULL CHECK (taille > 0),
  age_semaines INTEGER NOT NULL CHECK (age_semaines >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. STOCK
CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  centre_id INTEGER NOT NULL REFERENCES centre(id) ON DELETE RESTRICT,
  vaccin_id INTEGER NOT NULL REFERENCES vaccin(id) ON DELETE RESTRICT,
  quantite_disponible INTEGER NOT NULL DEFAULT 0 CHECK (quantite_disponible >= 0),
  seuil_alerte INTEGER NOT NULL DEFAULT 5 CHECK (seuil_alerte >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uc_stock_unique UNIQUE (centre_id, vaccin_id)
);

-- 12. AUDIT_LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id INTEGER,
  user_role VARCHAR(20),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. OTP_CODES
CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  telephone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  est_verifie BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. REFRESH_TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('parent', 'infirmier', 'admin')),
  token VARCHAR(500) NOT NULL,
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  est_revoque BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. FILE_ATTENTE
CREATE TABLE IF NOT EXISTS file_attente (
  id SERIAL PRIMARY KEY,
  numero_attente INTEGER NOT NULL,
  rendez_vous_id INTEGER REFERENCES rendez_vous(id) ON DELETE SET NULL,
  centre_id INTEGER NOT NULL REFERENCES centre(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES session(id) ON DELETE SET NULL,
  parent_id INTEGER NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  bebe_id INTEGER NOT NULL REFERENCES bebe(id) ON DELETE CASCADE,
  statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE'
    CHECK (statut IN ('EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ABANDONNE')),
  heure_arrivee TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  heure_debut_service TIMESTAMP WITH TIME ZONE,
  heure_fin_service TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. SYNC_QUEUE
CREATE TABLE IF NOT EXISTS sync_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('parent', 'infirmier', 'admin')),
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  server_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPLIED', 'CONFLICT', 'REJECTED')),
  conflict_resolution VARCHAR(20)
    CHECK (conflict_resolution IS NULL OR conflict_resolution IN ('SERVER_WINS', 'CLIENT_WINS', 'MANUAL')),
  error_message TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_centre_actif ON centre(est_actif);
CREATE INDEX idx_personnel_role ON personnel(role);
CREATE INDEX idx_personnel_centre ON personnel(centre_id);
CREATE INDEX idx_parent_telephone ON parent(telephone);
CREATE INDEX idx_parent_actif ON parent(est_actif);
CREATE INDEX idx_bebe_parent ON bebe(parent_id);
CREATE INDEX idx_bebe_date_naissance ON bebe(date_naissance);
CREATE INDEX idx_vaccin_actif ON vaccin(est_actif);
CREATE INDEX idx_session_centre ON session(centre_id);
CREATE INDEX idx_session_vaccin ON session(vaccin_id);
CREATE INDEX idx_session_date ON session(date_session);
CREATE INDEX idx_session_statut ON session(statut);
CREATE INDEX idx_session_centre_date ON session(centre_id, date_session);
CREATE INDEX idx_rdv_session ON rendez_vous(session_id);
CREATE INDEX idx_rdv_parent ON rendez_vous(parent_id);
CREATE INDEX idx_rdv_bebe ON rendez_vous(bebe_id);
CREATE INDEX idx_rdv_statut ON rendez_vous(statut);
CREATE INDEX idx_vaccination_rdv ON vaccination(rendez_vous_id);
CREATE INDEX idx_vaccination_personnel ON vaccination(personnel_id);
CREATE INDEX idx_vaccination_date ON vaccination(date_heure);
CREATE INDEX idx_croissance_bebe ON croissance(bebe_id);
CREATE INDEX idx_croissance_date ON croissance(date_mesure);
CREATE INDEX idx_stock_centre ON stock(centre_id);
CREATE INDEX idx_stock_vaccin ON stock(vaccin_id);
CREATE INDEX idx_flacon_vaccin ON flacon(vaccin_id);
CREATE INDEX idx_flacon_session ON flacon(session_id);
CREATE INDEX idx_flacon_ouverture ON flacon(date_ouverture);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_otp_telephone ON otp_codes(telephone);
CREATE INDEX idx_otp_expire ON otp_codes(expire_at);
CREATE INDEX idx_refresh_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id, user_role);
CREATE INDEX idx_file_attente_centre_date ON file_attente(centre_id, heure_arrivee);
CREATE INDEX idx_file_attente_statut ON file_attente(statut);
CREATE INDEX idx_file_attente_parent ON file_attente(parent_id);
CREATE INDEX idx_sync_queue_user_status ON sync_queue(user_id, user_role, status);
CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id);

-- ============================================
-- SEED DATA
-- ============================================
INSERT INTO centre (nom, adresse, telephone, gps_lat, gps_lng, est_actif)
VALUES ('Centre de Santé Es-Salaam', 'Province d''Oujda, Maroc', '+212536000000', 34.6814000, -1.9086000, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO vaccin (nom, doses_par_flacon, age_cible_semaines, maladies_ciblees, est_actif) VALUES
  ('BCG', 10, 0, 'Tuberculose', TRUE),
  ('Hépatite B', 1, 0, 'Hépatite B', TRUE),
  ('Pentavalent', 1, 8, 'Diphtérie, Tétanos, Coqueluche, Hépatite B, Hib', TRUE),
  ('Polio (VPI)', 1, 8, 'Poliomyélite', TRUE),
  ('Pneumocoque', 1, 8, 'Infections pneumococciques', TRUE),
  ('Rotavirus', 1, 8, 'Gastroentérite à rotavirus', TRUE),
  ('ROR', 1, 52, 'Rougeole, Oreillons, Rubéole', TRUE),
  ('Méningocoque', 1, 52, 'Méningite à méningocoque', TRUE),
  ('DTC', 1, 78, 'Diphtérie, Tétanos, Coqueluche (rappel)', TRUE),
  ('Polio (rappel)', 1, 78, 'Poliomyélite (rappel)', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_centre_updated BEFORE UPDATE ON centre FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_personnel_updated BEFORE UPDATE ON personnel FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_parent_updated BEFORE UPDATE ON parent FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bebe_updated BEFORE UPDATE ON bebe FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vaccin_updated BEFORE UPDATE ON vaccin FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_session_updated BEFORE UPDATE ON session FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rdv_updated BEFORE UPDATE ON rendez_vous FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vaccination_updated BEFORE UPDATE ON vaccination FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_croissance_updated BEFORE UPDATE ON croissance FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stock_updated BEFORE UPDATE ON stock FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_flacon_updated BEFORE UPDATE ON flacon FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_file_attente_updated BEFORE UPDATE ON file_attente FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sync_queue_updated BEFORE UPDATE ON sync_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS (for Statistics API)
-- ============================================
CREATE OR REPLACE VIEW v_session_remplissage AS
SELECT s.id AS session_id, s.centre_id, s.vaccin_id, s.date_session, s.statut, s.max_inscriptions,
  COUNT(rdv.id) FILTER (WHERE rdv.statut NOT IN ('ANNULE')) AS nb_inscrits,
  ROUND(COUNT(rdv.id) FILTER (WHERE rdv.statut NOT IN ('ANNULE')) * 100.0 / NULLIF(s.max_inscriptions, 0), 1) AS taux_remplissage
FROM session s LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id GROUP BY s.id;

CREATE OR REPLACE VIEW v_absenteisme AS
SELECT s.centre_id, s.date_session,
  COUNT(rdv.id) FILTER (WHERE rdv.statut = 'ABSENT') AS nb_absents,
  COUNT(rdv.id) FILTER (WHERE rdv.statut IN ('PRESENT', 'ABSENT')) AS nb_total,
  ROUND(COUNT(rdv.id) FILTER (WHERE rdv.statut = 'ABSENT') * 100.0 / NULLIF(COUNT(rdv.id) FILTER (WHERE rdv.statut IN ('PRESENT', 'ABSENT')), 0), 1) AS taux_absenteisme
FROM session s JOIN rendez_vous rdv ON rdv.session_id = s.id GROUP BY s.centre_id, s.date_session;
