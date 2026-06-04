const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ quiet: true });

const testDbName = process.env.TEST_DB_NAME || 'vaccinikids_test';

if (!/^[a-zA-Z0-9_]+_test$/.test(testDbName)) {
  console.error('Refusing to reset a database whose name does not end with _test');
  process.exit(1);
}

const connection = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

async function resetTestDatabase() {
  const maintenance = new Client({ ...connection, database: 'postgres' });
  await maintenance.connect();
  try {
    await maintenance.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [testDbName],
    );
    await maintenance.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
    await maintenance.query(`CREATE DATABASE "${testDbName}"`);
  } finally {
    await maintenance.end();
  }

  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = testDbName;

  const { pool } = require('../src/config/database');
  const { runMigrations } = require('../src/models/migrationRunner');
  try {
    await runMigrations();
    const seed = fs.readFileSync(path.join(__dirname, '..', 'seeds', 'development.sql'), 'utf8');
    await pool.query(seed);
    console.warn(`Test database ${testDbName} reset successfully`);
  } finally {
    await pool.end();
  }
}

resetTestDatabase().catch((error) => {
  console.error('Test database reset failed:', error.message);
  process.exitCode = 1;
});
