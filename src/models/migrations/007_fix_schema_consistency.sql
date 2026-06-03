-- Migration 007: Phase 1 backend schema consistency fixes
-- Adds missing offline sync/file-attente tables and timestamp columns used by sync.

ALTER TABLE vaccination
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE croissance
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

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

CREATE INDEX IF NOT EXISTS idx_file_attente_centre_date ON file_attente(centre_id, heure_arrivee);
CREATE INDEX IF NOT EXISTS idx_file_attente_statut ON file_attente(statut);
CREATE INDEX IF NOT EXISTS idx_file_attente_parent ON file_attente(parent_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_status ON sync_queue(user_id, user_role, status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);

DROP TRIGGER IF EXISTS trg_vaccination_updated ON vaccination;
CREATE TRIGGER trg_vaccination_updated
  BEFORE UPDATE ON vaccination
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_croissance_updated ON croissance;
CREATE TRIGGER trg_croissance_updated
  BEFORE UPDATE ON croissance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_file_attente_updated ON file_attente;
CREATE TRIGGER trg_file_attente_updated
  BEFORE UPDATE ON file_attente
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_sync_queue_updated ON sync_queue;
CREATE TRIGGER trg_sync_queue_updated
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
