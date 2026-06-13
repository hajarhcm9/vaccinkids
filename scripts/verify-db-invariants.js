const { pool } = require('../src/config/database');
const { runMigrations } = require('../src/models/migrationRunner');

const requiredIndexes = [
  'uq_vaccination_rendez_vous',
  'uq_file_attente_active_rdv',
  'idx_session_centre_date_status',
  'idx_rendez_vous_session_status',
  'idx_vaccination_date',
];

async function verify() {
  await runMigrations();
  await runMigrations();

  const indexes = await pool.query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
    [requiredIndexes],
  );
  const found = new Set(indexes.rows.map((row) => row.indexname));
  const missing = requiredIndexes.filter((name) => !found.has(name));
  if (missing.length) throw new Error(`Missing required database indexes: ${missing.join(', ')}`);

  const triggers = await pool.query(
    `SELECT DISTINCT trigger_name FROM information_schema.triggers
     WHERE trigger_name IN ('trg_enforce_flacon_capacity', 'audit_log_append_only')`,
  );
  if (triggers.rows.length !== 2) throw new Error('Required invariant triggers are missing');

  const stockMovementConstraint = await pool.query(
    `SELECT pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE conname = 'stock_movement_type_check'`,
  );
  if (!stockMovementConstraint.rows[0]?.definition.includes('VIAL_OPEN')) {
    throw new Error('Stock movement constraint does not include VIAL_OPEN');
  }

  console.warn('Database migrations are repeatable and required invariants are present');
}

verify()
  .catch((error) => {
    console.error('Database invariant verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
