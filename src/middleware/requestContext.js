const crypto = require('crypto');

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._-]{8,128}$/;

const anonymizeUser = (user) => {
  if (!user) return null;
  const salt = process.env.LOG_USER_HASH_SALT || process.env.JWT_SECRET;
  if (!salt) return null;
  return crypto
    .createHmac('sha256', salt)
    .update(`${user.role}:${user.id}`)
    .digest('hex')
    .slice(0, 16);
};

const requestContext = (req, res, next) => {
  const incomingId = req.get('x-request-id');
  req.requestId =
    incomingId && REQUEST_ID_PATTERN.test(incomingId) ? incomingId : crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') return;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.warn(
      JSON.stringify({
        level: res.statusCode >= 500 ? 'error' : 'info',
        event: 'http_request',
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        user: anonymizeUser(req.user),
        role: req.user?.role || null,
      }),
    );
  });

  next();
};

module.exports = requestContext;
