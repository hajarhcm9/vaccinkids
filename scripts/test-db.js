require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5433,
  database: process.env.DB_NAME || 'vaccinikids',
  user: process.env.DB_USER || 'vaccinikids_user',
  password: process.env.DB_PASSWORD || 'vaccinikids_password',
});

async function testConn() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('DB Conn OK:', res.rows[0]);
    await pool.end();
  } catch (error) {
    console.error('DB Conn FAIL:', error.message);
    console.error('Full error:', error);
    process.exitCode = 1;
  }
}

testConn();
