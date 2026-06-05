CREATE TABLE IF NOT EXISTS stock_movement (
  id SERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stock(id) ON DELETE SET NULL,
  centre_id INTEGER NOT NULL REFERENCES centre(id),
  vaccin_id INTEGER NOT NULL REFERENCES vaccin(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('UPSERT', 'ADJUSTMENT', 'THRESHOLD')),
  quantite_avant INTEGER,
  quantite_apres INTEGER NOT NULL,
  seuil_avant INTEGER,
  seuil_apres INTEGER,
  motif TEXT,
  user_id INTEGER REFERENCES personnel(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movement_stock ON stock_movement(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_centre ON stock_movement(centre_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_created ON stock_movement(created_at DESC);
