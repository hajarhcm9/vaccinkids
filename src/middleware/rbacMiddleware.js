const ApiError = require('../utils/ApiError');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        ),
      );
    }
    return next();
  };
};

module.exports = { authorize };
