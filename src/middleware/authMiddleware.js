const TokenService = require('../services/tokenService');
const Parent = require('../models/Parent');
const Personnel = require('../models/Personnel');
const ApiError = require('../utils/ApiError');

const normalizeAuthError = (error) => {
  if (error.statusCode) return error;

  console.error(
    JSON.stringify({
      level: 'error',
      event: 'auth_service_unavailable',
      message: error.message,
      code: error.code,
    }),
  );
  return ApiError.internal('Authentication service unavailable');
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required. Please provide a valid token.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = TokenService.verifyAccessToken(token);

    let user = null;
    if (decoded.role === 'parent') {
      user = await Parent.findById(decoded.userId);
    } else if (decoded.role === 'infirmier' || decoded.role === 'admin') {
      user = await Personnel.findById(decoded.userId);
    }

    if (!user) {
      throw ApiError.unauthorized('User not found or deactivated.');
    }
    if (user.est_actif === false) {
      throw ApiError.forbidden('Your account has been deactivated.');
    }
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      telephone: decoded.telephone,
      centre_id: user.centre_id || null,
    };

    return next();
  } catch (error) {
    return next(normalizeAuthError(error));
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = TokenService.verifyAccessToken(token);

      let user = null;
      if (decoded.role === 'parent') {
        user = await Parent.findById(decoded.userId);
      } else if (decoded.role === 'infirmier' || decoded.role === 'admin') {
        user = await Personnel.findById(decoded.userId);
      }

      if (user && user.est_actif !== false) {
        req.user = {
          id: decoded.userId,
          role: decoded.role,
          telephone: decoded.telephone,
          centre_id: user.centre_id || null,
        };
      }
    }
  } catch (error) {
    // Silently ignore
  }
  return next();
};

module.exports = { authenticate, optionalAuth };
