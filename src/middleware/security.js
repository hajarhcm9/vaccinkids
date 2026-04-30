const helmet = require('helmet');
const hpp = require('hpp');

const sanitizeXss = (req, res, next) => {
  const stripTags = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script[^>]*><\/script>/gi, '');
  };
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = stripTags(req.body[key]);
      }
    });
  }
  next();
};

const setupSecurity = (app) => {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));
  app.use(hpp());
  app.use(sanitizeXss);
};

module.exports = setupSecurity;
