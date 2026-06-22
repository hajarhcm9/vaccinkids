const config = require('../config');
const ApiError = require('../utils/ApiError');

const requireSurface = (enabled, name) => (req, res, next) => {
  if (!enabled) return next(ApiError.notFound(`${name} is not available`));
  return next();
};

const requireWebAdminSurface = requireSurface(config.surfaces.webAdminEnabled, 'Web admin');

module.exports = { requireSurface, requireWebAdminSurface };
