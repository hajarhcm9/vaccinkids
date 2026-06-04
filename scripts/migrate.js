const { pool } = require('../src/config/database');
const { runMigrations } = require('../src/models/migrationRunner');

async function migrate() {
  try {
    await runMigrations();
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Migration command failed:', error.message);
  process.exitCode = 1;
});
