const { Pool } = require('pg');
require('dotenv').config();

const describeDbError = (error) => {
  const details = [
    error.message,
    error.code && `code=${error.code}`,
    error.address && `address=${error.address}`,
    error.port && `port=${error.port}`,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' ') : 'Unknown PostgreSQL error';
};

/**
 * PostgreSQL connection pool configuration
 */
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost") && !process.env.DATABASE_URL.includes("127.0.0.1") ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'vaccinikids',
      user: process.env.DB_USER || 'vaccinkids_user',
      password: process.env.DB_PASSWORD || 'vaccinikids_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

// Connection events
pool.on('connect', () => {
  console.warn('✅ PostgreSQL connected successfully');
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
