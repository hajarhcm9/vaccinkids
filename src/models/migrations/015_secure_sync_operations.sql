ALTER TABLE sync_queue
  ADD COLUMN IF NOT EXISTS client_operation_id VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_queue_client_operation
  ON sync_queue(user_id, user_role, client_operation_id)
  WHERE client_operation_id IS NOT NULL;

UPDATE sync_queue
SET conflict_resolution = 'SERVER_WINS'
WHERE conflict_resolution IN ('CLIENT_WINS', 'MANUAL');

ALTER TABLE sync_queue
  DROP CONSTRAINT IF EXISTS sync_queue_conflict_resolution_check;

ALTER TABLE sync_queue
  ADD CONSTRAINT sync_queue_conflict_resolution_check
  CHECK (conflict_resolution IS NULL OR conflict_resolution = 'SERVER_WINS');
