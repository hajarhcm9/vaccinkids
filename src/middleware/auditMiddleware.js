const AuditLog = require('../models/AuditLog');
const { pool } = require('../config/database');

const methodToAction = {
  POST: 'INSERT',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

const tableFromPath = (path) => {
  const segment = path.split('/').filter(Boolean)[1];
  const map = {
    carnet: 'bebe',
    flacons: 'flacon',
    'rendez-vous': 'rendez_vous',
    sessions: 'session',
    stock: 'stock',
    vaccins: 'vaccin',
    vaccinations: 'vaccination',
  };
  return map[segment] || segment || 'unknown';
};

const auditMiddleware = async (req, res, next) => {
  const action = methodToAction[req.method];
  if (!action || !req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/api/auth')) {
    return next();
  }

  // Capture old values for UPDATE/DELETE
  let oldRecord = null;
  if ((action === 'UPDATE' || action === 'DELETE') && req.params && req.params.id) {
    try {
      const tableName = tableFromPath(req.originalUrl);
      const knownTables = new Set(['bebe', 'flacon', 'rendez_vous', 'session', 'stock', 'vaccin', 'vaccination']);
      if (knownTables.has(tableName)) {
        const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
        if (result.rows.length > 0) oldRecord = result.rows[0];
      }
    } catch (e) {
      // If we cannot fetch old values, just continue with null
    }
  }

  const originalJson = res.json.bind(res);
  let responseBody;

  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    if (res.statusCode >= 400) return;

    const data = responseBody && responseBody.data;
    const record = Array.isArray(data) ? data[0] : data;
    const recordId = record && typeof record === 'object' && record.id ? record.id : (req.params && req.params.id ? parseInt(req.params.id) : 0);

    AuditLog.create({
      table_name: tableFromPath(req.originalUrl),
      record_id: recordId,
      action,
      old_values: oldRecord,
      new_values: record && typeof record === 'object' ? record : null,
      user_id: req.user ? req.user.id : null,
      user_role: req.user ? req.user.role : null,
    }).catch((error) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Audit logging failed:', error.message);
      }
    });
  });

  return next();
};

module.exports = auditMiddleware;
