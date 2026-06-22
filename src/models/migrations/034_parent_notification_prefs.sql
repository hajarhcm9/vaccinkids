-- Add JSONB column to store each parent's notification preferences.
-- Defaults match the client-side DEFAULT_PREFS constant in NotificationSettingsScreen.
ALTER TABLE parent
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB
  NOT NULL DEFAULT '{"rdvRappel":true,"rdvConfirmation":true,"vaccinsRetard":true,"actualites":false}'::jsonb;
