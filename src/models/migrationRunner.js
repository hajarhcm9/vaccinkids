const fs = require('fs');
const path = require('path');
const { getClient } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getExecutedMigrations(client) {
  const result = await client.query('SELECT filename FROM _migrations ORDER BY id');
  return result.rows.map((row) => row.filename);
}

async function runMigrations() {
  const client = await getClient();
  try {
    console.log('🔄 Checking for pending migrations...');
    await ensureMigrationTable(client);
    const executed = await getExecutedMigrations(client);
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    let executedCount = 0;
    for (const file of files) {
      if (executed.includes(file)) continue;
      console.log(`📋 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Migration ${file} executed successfully`);
        executedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration ${file} failed:`, error.message);
        throw error;
      }
    }

    if (executedCount === 0) {
      console.log('✅ All migrations are up to date');
    } else {
      console.log(`✅ ${executedCount} migration(s) executed successfully`);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
