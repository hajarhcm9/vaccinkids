const ApiError = require('../utils/ApiError');
const { parseCookies } = require('../utils/cookies');

const requireWebCsrf = (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const headerToken = req.get('x-csrf-token');
  if (!cookies.vk_admin_csrf || !headerToken || cookies.vk_admin_csrf !== headerToken) {
    return next(ApiError.forbidden('Invalid CSRF token'));
  }
  return next();
};

module.exports = requireWebCsrf;
