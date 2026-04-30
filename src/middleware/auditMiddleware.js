const AuditLog = require('../models/AuditLog');

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

const auditMiddleware = (req, res, next) => {
  const action = methodToAction[req.method];
  if (!action || !req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/api/auth')) {
    return next();
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
    const recordId = record && typeof record === 'object' && record.id ? record.id : 0;

    AuditLog.create({
      table_name: tableFromPath(req.originalUrl),
      record_id: recordId,
      action,
      old_values: null,
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
