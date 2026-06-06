const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const config = require('../config');
const { getRedisClient, connectRedis } = require('../config/redis');
const metrics = require('../services/metricsService');

function rateLimitKey(req) {
  if (req.user?.id) return `${req.user.role}:${req.user.id}`;
  return ipKeyGenerator(req.ip);
}

function createStore(profile) {
  if (!config.rateLimit.useSharedStore) return undefined;
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    prefix: `vaccinikids:rate-limit:${profile}:`,
    sendCommand: async (...args) => {
      if (!client.isOpen) await connectRedis();
      return client.sendCommand(args);
    },
  });
}

function blockedHandler(profile) {
  return (req, res, _next, options) => {
    metrics.recordRateLimit(profile);
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'rate_limit_blocked',
          profile,
          requestId: req.requestId,
          path: req.originalUrl.split('?')[0],
          method: req.method,
          ip: req.ip,
          role: req.user?.role || null,
        }),
      );
    }
    res.status(options.statusCode).json({
      status: 'error',
      message: 'Too many requests, please try again later.',
      requestId: req.requestId,
    });
  };
}

function createLimiter(profile, overrides = {}) {
  const settings = config.rateLimit.profiles[profile];
  if (!settings) throw new Error(`Unknown rate limit profile: ${profile}`);
  return rateLimit({
    ...settings,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: rateLimitKey,
    handler: blockedHandler(profile),
    store: createStore(profile),
    ...overrides,
  });
}

const apiLimiter = createLimiter('api');
const otpLimiter = createLimiter('otp');
const loginLimiter = createLimiter('login');
const refreshLimiter = createLimiter('refresh');
const exportLimiter = createLimiter('exports');
const kioskLimiter = createLimiter('kiosk');

module.exports = {
  createLimiter,
  authLimiter: loginLimiter,
  apiLimiter,
  otpLimiter,
  loginLimiter,
  refreshLimiter,
  exportLimiter,
  kioskLimiter,
};
