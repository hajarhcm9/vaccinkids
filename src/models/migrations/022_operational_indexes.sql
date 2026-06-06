CREATE INDEX IF NOT EXISTS idx_session_centre_date_status
  ON session(centre_id, date_session, statut);

CREATE INDEX IF NOT EXISTS idx_rendez_vous_session_status
  ON rendez_vous(session_id, statut);

CREATE INDEX IF NOT EXISTS idx_vaccination_date
  ON vaccination(date_heure DESC);

CREATE INDEX IF NOT EXISTS idx_file_attente_centre_status_arrival
  ON file_attente(centre_id, statut, heure_arrivee, numero_attente);

CREATE UNIQUE INDEX IF NOT EXISTS uq_file_attente_active_rdv
  ON file_attente(rendez_vous_id)
  WHERE statut IN ('EN_ATTENTE', 'EN_COURS');

CREATE INDEX IF NOT EXISTS idx_otp_active_phone
  ON otp_codes(telephone, created_at DESC)
  WHERE est_verifie = FALSE;

CREATE INDEX IF NOT EXISTS idx_refresh_token_active_user
  ON refresh_tokens(user_id, user_role, expire_at)
  WHERE est_revoque = FALSE;
