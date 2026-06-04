const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

const describeDbError = (error) => {
  const details = [
    error.message,
    error.code && `code=${error.code}`,
    error.address && `address=${error.address}`,
    error.port && `port=${error.port}`,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' ') : 'Unknown PostgreSQL error';
};

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    console.error(`FATAL: ${key} must be set in environment`);
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && value.indexOf('dev-only-') === 0) {
    console.error(`FATAL: ${key} must not use dev-only values in production`);
    process.exit(1);
  }
  if (process.env.NODE_ENV !== 'production' && value.indexOf('dev-only-') === 0) {
    console.warn(`WARNING: ${key} uses a dev-only value. Change it before production.`);
  }
  return value;
};

/**
 * PostgreSQL connection pool configuration
 */
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_URL &&
        !process.env.DATABASE_URL.includes('localhost') &&
        !process.env.DATABASE_URL.includes('127.0.0.1')
          ? { rejectUnauthorized: false }
          : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'vaccinikids',
      user: requireEnv('DB_USER'),
      password: requireEnv('DB_PASSWORD'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

// Connection events
pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('✅ PostgreSQL connected successfully');
  }
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
  if (process.env.NODE_ENV === 'production') {
    if (err.code === 'ECONNREFUSED' || err.code === '57P01') {
      console.error('Fatal DB connection error, shutting down...');
      process.exit(1);
    }
  }
});

/**
 * Execute a query with error handling and timing
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.warn(`📊 Query executed in ${duration}ms: ${text.substring(0, 80)}...`);
    }
    return res;
  } catch (error) {
    console.error(`❌ Query error: ${describeDbError(error)}`);
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise} Pool client
 */
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = { pool, query, getClient, describeDbError };
