const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getExecutedMigrations() {
  const result = await query('SELECT filename FROM _migrations ORDER BY id');
  return result.rows.map((row) => row.filename);
}

async function runMigrations() {
  try {
    console.warn('🔄 Checking for pending migrations...');
    await ensureMigrationTable();
    const executed = await getExecutedMigrations();
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.warn('⚠️  No migration files found');
      return;
    }

    let executedCount = 0;
    for (const file of files) {
      if (executed.includes(file)) continue;
      console.warn(`📋 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await query('BEGIN');
      try {
        await query(sql);
        await query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await query('COMMIT');
        console.warn(`✅ Migration ${file} executed successfully`);
        executedCount++;
      } catch (error) {
        await query('ROLLBACK');
        console.error(`❌ Migration ${file} failed:`, error.message);
        throw error;
      }
    }

    if (executedCount === 0) {
      console.warn('✅ All migrations are up to date');
    } else {
      console.warn(`✅ ${executedCount} migration(s) executed successfully`);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

module.exports = { runMigrations };
