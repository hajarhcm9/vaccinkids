const AuditLog = require('../models/AuditLog');

const methodToAction = {
  POST: 'INSERT',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

const sensitiveReadPrefixes = [
  '/api/admin',
  '/api/absenteisme',
  '/api/alertes-retard',
  '/api/carnet',
  '/api/exports',
  '/api/file-attente',
  '/api/pdf',
  '/api/recherche',
  '/api/rendez-vous',
  '/api/stats',
  '/api/stock',
  '/api/vaccinations',
];

const criticalPrefixes = [
  '/api/admin',
  '/api/exports',
  '/api/flacons',
  '/api/stock',
  '/api/vaccinations',
];

const tableFromPath = (path) => {
  const segment = path.split('/').filter(Boolean)[1];
  const map = {
    auth: 'authentication',
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

function getAuditAction(req) {
  const isSensitiveRead =
    req.method === 'GET' &&
    sensitiveReadPrefixes.some((prefix) => req.originalUrl.startsWith(prefix));
  const action =
    methodToAction[req.method] ||
    (isSensitiveRead ? (req.originalUrl.startsWith('/api/exports') ? 'EXPORT' : 'READ') : null);
  return { action, isSensitiveRead };
}

function auditEntry(req, responseBody, action) {
  const responseUser = responseBody?.data?.user;
  const responseRecord = responseBody?.data;
  const responseId =
    responseRecord && !Array.isArray(responseRecord) && typeof responseRecord === 'object'
      ? responseRecord.id
      : null;

  return {
    table_name: tableFromPath(req.originalUrl),
    record_id: responseId || parseInt(req.params?.id, 10) || 0,
    action,
    old_values: null,
    new_values: {
      path: req.originalUrl.split('?')[0],
      query: req.query,
      result_id: responseId || null,
      status: responseBody?.status || 'success',
    },
    user_id: req.user?.id || responseUser?.id || null,
    user_role: req.user?.role || responseUser?.role || null,
    request_id: req.requestId,
  };
}

const auditMiddleware = (req, res, next) => {
  const { action } = getAuditAction(req);
  if (!action || !req.originalUrl.startsWith('/api/')) return next();

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let auditStarted = false;
  let sendingJson = false;

  const handleAuditFailure = (error, fallback) => {
    const critical = criticalPrefixes.some((prefix) => req.originalUrl.startsWith(prefix));
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'audit_write_failed',
        requestId: req.requestId,
        critical,
        message: error.message,
      }),
    );
    if (critical) {
      res.status(503);
      sendingJson = true;
      return originalJson({
        status: 'error',
        message: 'Operation could not be safely audited',
        requestId: req.requestId,
      });
    }
    return fallback();
  };

  res.json = (body) => {
    if (auditStarted || res.statusCode >= 400) return originalJson(body);
    auditStarted = true;

    AuditLog.create(auditEntry(req, body, action))
      .then(() => {
        sendingJson = true;
        return originalJson(body);
      })
      .catch((error) => handleAuditFailure(error, () => originalJson(body)));
    return res;
  };

  res.send = (body) => {
    if (sendingJson || auditStarted || res.statusCode >= 400) return originalSend(body);
    auditStarted = true;
    AuditLog.create(auditEntry(req, null, action))
      .then(() => originalSend(body))
      .catch((error) => handleAuditFailure(error, () => originalSend(body)));
    return res;
  };

  return next();
};

module.exports = auditMiddleware;
