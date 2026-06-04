const fs = require('fs');
const path = require('path');
const { describeDbError, pool } = require('../src/config/database');

async function seedDevelopment() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed is forbidden in production');
  }

  const sql = fs.readFileSync(path.join(__dirname, '..', 'seeds', 'development.sql'), 'utf8');
  await pool.query(sql);
  console.warn('Development seed applied');
}

seedDevelopment()
  .catch((error) => {
    console.error('Development seed failed:', describeDbError(error));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
