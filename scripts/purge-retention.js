const { pool } = require('../src/config/database');

function positiveInt(name, fallback = null) {
  if (!process.env[name]) return fallback;
  const value = Number.parseInt(process.env[name], 10);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be positive`);
  return value;
}

async function main() {
  const apply = process.env.RETENTION_APPLY === 'true';
  const policies = [
    {
      name: 'expired OTP codes',
      sql: `DELETE FROM otp_codes WHERE expire_at < NOW() - ($1 || ' hours')::interval`,
      countSql: `SELECT COUNT(*)::int AS count FROM otp_codes
        WHERE expire_at < NOW() - ($1 || ' hours')::interval`,
      value: positiveInt('RETENTION_OTP_HOURS', 24),
    },
    {
      name: 'expired or revoked refresh tokens',
      sql: `DELETE FROM refresh_tokens
        WHERE expire_at < NOW() - ($1 || ' days')::interval
           OR revoked_at < NOW() - ($1 || ' days')::interval`,
      countSql: `SELECT COUNT(*)::int AS count FROM refresh_tokens
        WHERE expire_at < NOW() - ($1 || ' days')::interval
           OR revoked_at < NOW() - ($1 || ' days')::interval`,
      value: positiveInt('RETENTION_REFRESH_DAYS', 30),
    },
    {
      name: 'old read notifications',
      sql: `DELETE FROM notification
        WHERE lu = TRUE AND created_at < NOW() - ($1 || ' days')::interval`,
      countSql: `SELECT COUNT(*)::int AS count FROM notification
        WHERE lu = TRUE AND created_at < NOW() - ($1 || ' days')::interval`,
      value: positiveInt('RETENTION_NOTIFICATION_DAYS'),
    },
    {
      name: 'completed synchronization commands',
      sql: `DELETE FROM sync_queue
        WHERE status IN ('APPLIED', 'REJECTED')
          AND created_at < NOW() - ($1 || ' days')::interval`,
      countSql: `SELECT COUNT(*)::int AS count FROM sync_queue
        WHERE status IN ('APPLIED', 'REJECTED')
          AND created_at < NOW() - ($1 || ' days')::interval`,
      value: positiveInt('RETENTION_SYNC_DAYS'),
    },
  ].filter((policy) => policy.value !== null);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const policy of policies) {
      const result = await client.query(apply ? policy.sql : policy.countSql, [policy.value]);
      const count = apply ? result.rowCount : result.rows[0].count;
      console.warn(`${apply ? 'Purged' : 'Eligible'}: ${policy.name}: ${count}`);
    }
    if (apply) await client.query('COMMIT');
    else await client.query('ROLLBACK');
    console.warn(apply ? 'Retention purge applied' : 'Dry run only; set RETENTION_APPLY=true to purge');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Retention purge failed: ${error.message}`);
  process.exit(1);
});
