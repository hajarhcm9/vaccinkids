-- Day 20: Admin Management & Audit Log
-- Additional indexes for audit log performance

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id);

-- Index for action + table_name composite queries
CREATE INDEX IF NOT EXISTS idx_audit_action_table ON audit_log(action, table_name);

-- Index for recent activity queries
CREATE INDEX IF NOT EXISTS idx_audit_timestamp_desc ON audit_log(timestamp DESC);
