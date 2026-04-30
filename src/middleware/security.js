const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');

const setupSecurity = (app) => {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }));
  app.use(hpp());
  app.use(xss());
};

module.exports = setupSecurity;
