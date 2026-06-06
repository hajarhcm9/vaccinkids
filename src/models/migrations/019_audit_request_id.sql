ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS request_id VARCHAR(128);
CREATE INDEX IF NOT EXISTS idx_audit_log_request_id ON audit_log(request_id);
