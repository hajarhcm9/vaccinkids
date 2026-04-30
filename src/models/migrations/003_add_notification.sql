-- ============================================================
-- Day 11 — Notification system migration
-- ============================================================

-- Notification table
CREATE TABLE IF NOT EXISTS notification (
  id SERIAL PRIMARY KEY,
  destinataire_id INTEGER NOT NULL,
  destinataire_type VARCHAR(20) NOT NULL DEFAULT 'parent',
  type VARCHAR(50) NOT NULL,
  canal VARCHAR(20) NOT NULL DEFAULT 'in_app',
  titre VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  lu BOOLEAN DEFAULT FALSE,
  envoye BOOLEAN DEFAULT FALSE,
  date_envoi TIMESTAMP,
  reference_id INTEGER,
  reference_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_destinataire
  ON notification(destinataire_id, destinataire_type);

CREATE INDEX IF NOT EXISTS idx_notification_type
  ON notification(type);

CREATE INDEX IF NOT EXISTS idx_notification_lu
  ON notification(destinataire_id, lu);
