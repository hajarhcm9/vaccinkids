const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ quiet: true });

const baseName = process.env.TEST_DB_NAME || 'vaccinikids_test';
const upgradeDb = `${baseName.replace(/_test$/, '')}_upgrade_test`;
const connection = {
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};
const migrationsDir = path.join(__dirname, '..', 'src', 'models', 'migrations');

async function main() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  if (files.length < 2) throw new Error('At least two migrations are required');

  const maintenance = new Client({ ...connection, database: 'postgres' });
  await maintenance.connect();
  await maintenance.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [upgradeDb],
  );
  await maintenance.query(`DROP DATABASE IF EXISTS "${upgradeDb}"`);
  await maintenance.query(`CREATE DATABASE "${upgradeDb}"`);
  await maintenance.end();

  const client = new Client({ ...connection, database: upgradeDb });
  await client.connect();
  try {
    await client.query(`CREATE TABLE _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`);
    for (const file of files.slice(0, -1)) {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
    }

    const previousCount = await client.query('SELECT COUNT(*)::int AS count FROM _migrations');
    const latest = files.at(-1);
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(migrationsDir, latest), 'utf8'));
    await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [latest]);
    await client.query('COMMIT');
    const finalCount = await client.query('SELECT COUNT(*)::int AS count FROM _migrations');

    if (
      previousCount.rows[0].count !== files.length - 1 ||
      finalCount.rows[0].count !== files.length
    ) {
      throw new Error('Migration history count is inconsistent');
    }
    console.warn(`Previous-version upgrade succeeded: ${files.at(-2)} -> ${latest}`);
  } finally {
    await client.end();
    const cleanup = new Client({ ...connection, database: 'postgres' });
    await cleanup.connect();
    await cleanup.query(`DROP DATABASE IF EXISTS "${upgradeDb}"`);
    await cleanup.end();
  }
}

main().catch((error) => {
  console.error(`Previous-version migration test failed: ${error.message}`);
  process.exit(1);
});
