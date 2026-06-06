'use strict';

const helmet = require('helmet');
const hpp = require('hpp');

/**
 * Setup security middleware on the Express app
 * @param {Express} app - Express application instance
 */
function setupSecurity(app) {
  // ===== Helmet - Security HTTP headers =====
  app.use(helmet());
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    }),
  );
  app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));

  // ===== HTTP Parameter Pollution Protection =====
  app.use(hpp());
}

module.exports = setupSecurity;
