const { query } = require('../config/database');

const sensitiveFields = new Set([
  'code',
  'code_hash',
  'devOtp',
  'fcm_token',
  'mot_de_passe',
  'otpCode',
  'password',
  'privateKey',
  'accessToken',
  'refreshToken',
  'token',
]);

const redactSensitiveValues = (value) => {
  if (Array.isArray(value)) return value.map(redactSensitiveValues);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveFields.has(key) ? '[REDACTED]' : redactSensitiveValues(nestedValue),
    ]),
  );
};

const AuditLog = {
  async create(entry) {
    const {
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      user_role,
      request_id,
    } = entry;
    const result = await query(
      `INSERT INTO audit_log
         (table_name, record_id, action, old_values, new_values, user_id, user_role, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        table_name,
        record_id,
        action,
        redactSensitiveValues(old_values),
        redactSensitiveValues(new_values),
        user_id,
        user_role,
        request_id || null,
      ],
    );
    return result.rows[0];
  },

  async findByTable(tableName, limit = 100) {
    const result = await query(
      'SELECT * FROM audit_log WHERE table_name = $1 ORDER BY timestamp DESC LIMIT $2',
      [tableName, limit],
    );
    return result.rows;
  },

  async findByUser(userId) {
    const result = await query(
      'SELECT * FROM audit_log WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 50',
      [userId],
    );
    return result.rows;
  },

  async findRecent(limit = 50) {
    const result = await query('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT $1', [limit]);
    return result.rows;
  },

  async getStatsByUser(startDate, endDate) {
    const result = await query(
      `SELECT user_id, user_role, COUNT(*) as total_actions,
              COUNT(*) FILTER (WHERE action = 'INSERT') as inserts,
              COUNT(*) FILTER (WHERE action = 'UPDATE') as updates,
              COUNT(*) FILTER (WHERE action = 'DELETE') as deletes
       FROM audit_log WHERE timestamp BETWEEN $1 AND $2 GROUP BY user_id, user_role`,
      [startDate, endDate],
    );
    return result.rows;
  },
};

module.exports = AuditLog;
