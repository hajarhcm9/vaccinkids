const { query } = require('../config/database');

const AuditLog = {
  async create(entry) {
    const { table_name, record_id, action, old_values, new_values, user_id, user_role } = entry;
    const result = await query(
      `INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id, user_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [table_name, record_id, action, old_values, new_values, user_id, user_role],
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
