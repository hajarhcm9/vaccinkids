'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('============================================================');
console.log('  FIX DAY 23 v3: Surgical approach - NO app.js changes');
console.log('============================================================\n');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { cwd: PROJECT, encoding: 'utf8', timeout: 120000, ...options });
  } catch (e) {
    return e.stdout || e.stderr || e.message;
  }
}

function writeFile(relPath, content) {
  const fullPath = path.join(PROJECT, relPath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`  [OK] Wrote ${relPath}`);
}

function readFile(relPath) {
  return fs.readFileSync(path.join(PROJECT, relPath), 'utf8');
}

// ============================================================
// STEP 1: RESTORE app.js from git EXACTLY (Day 22 commit)
// No modifications to app.js at all!
// ============================================================
console.log('STEP 1: Restoring app.js from git (Day 22 commit)...\n');

const gitRestore = run('git checkout 33626cd -- src/app.js 2>&1');
console.log('  Git restore result:', gitRestore.substring(0, 200));

// Verify it's clean
const appJs = readFile('src/app.js');
console.log('  App.js first 10 lines:');
appJs.split('\n').slice(0, 10).forEach((line, i) => {
  console.log(`    ${i + 1}: ${line}`);
});

// Make sure there's NO helmet/sanitize/passwordStrength/checkAccountLock in app.js
const badPatterns = ['helmet()', 'sanitizeInput', 'passwordStrengthCheck', 'checkAccountLock'];
badPatterns.forEach(p => {
  if (appJs.includes(p)) {
    console.log(`  ⚠️ WARNING: app.js still contains ${p}!`);
  }
});

// ============================================================
// STEP 2: Modify security.js to add Helmet
// This is the existing setupSecurity(app) function
// ============================================================
console.log('\nSTEP 2: Enhancing security.js with Helmet...\n');

const securityJs = readFile('src/middleware/security.js');
console.log('  Current security.js content:');
console.log(securityJs.substring(0, 500));

// Read the full security.js to understand what it does
console.log('\n  Full security.js:');
console.log(securityJs);

// Add helmet to the existing setupSecurity function
// We'll rewrite it to include helmet
writeFile('src/middleware/security.js', `'use strict';

const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const config = require('../config');

/**
 * Setup security middleware on the Express app
 * @param {Express} app - Express application instance
 */
function setupSecurity(app) {
  // ===== Helmet - Security HTTP headers =====
  app.use(helmet());
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    }
  }));
  app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));

  // ===== HTTP Parameter Pollution Protection =====
  app.use(hpp());
}

module.exports = setupSecurity;
`);

// ============================================================
// STEP 3: Fix rateLimiter.js - remove custom keyGenerator
// ============================================================
console.log('\nSTEP 3: Fixing rateLimiter.js...\n');

writeFile('src/middleware/rateLimiter.js', `'use strict';

const rateLimit = require('express-rate-limit');

// General API rate limiter - 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth rate limiter - 5 failed login attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Password reset rate limiter - 3 attempts per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    status: 'error',
    message: 'Too many password reset attempts, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Export rate limiter - 10 exports per hour
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    message: 'Too many export requests, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  exportLimiter
};
`);

// ============================================================
// STEP 4: Fix auditMiddleware.js - export function for app.use
// ============================================================
console.log('\nSTEP 4: Fixing auditMiddleware.js...\n');

writeFile('src/middleware/auditMiddleware.js', `'use strict';

const { pool } = require('../config/database');

/**
 * Audit Middleware
 * Default export is a middleware function for app.use() compatibility
 * Also provides named exports for specific audit actions
 */

const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  ACCOUNT_LOCK: 'ACCOUNT_LOCK',
  ACCOUNT_UNLOCK: 'ACCOUNT_UNLOCK',
  EXPORT_DATA: 'EXPORT_DATA',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS'
};

/**
 * Default audit middleware - logs all API requests
 * Usage: app.use('/api/', require('./middleware/auditMiddleware'))
 */
function auditMiddleware(req, res, next) {
  const originalEnd = res.end;
  res.end = function(...args) {
    setImmediate(async () => {
      try {
        const userId = req.user?.id || null;
        const userRole = req.user?.role || null;
        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const userAgent = req.get('user-agent') || null;
        const resource = req.originalUrl || req.url;
        const method = req.method;
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 400;

        if (resource === '/health' || resource === '/api/health') return;

        await pool.query(
          \`INSERT INTO audit_log (user_id, user_role, action, resource, method, status_code, ip_address, user_agent, response_status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())\`,
          [userId, userRole, method + '_' + resource.replace(/\\//g, '_').substring(0, 80), resource, method, statusCode, ipAddress, userAgent, isSuccess ? 'SUCCESS' : 'FAILURE']
        );
      } catch (err) {
        console.error('Audit log error:', err.message);
      }
    });
    originalEnd.apply(res, args);
  };
  next();
}

/**
 * Create audit middleware for specific actions
 * Usage: router.post('/login', auditLog('LOGIN_ATTEMPT'), handler)
 */
const auditLog = (action) => {
  return (req, res, next) => {
    const originalEnd = res.end;
    res.end = function(...args) {
      setImmediate(async () => {
        try {
          const userId = req.user?.id || null;
          const userRole = req.user?.role || null;
          const ipAddress = req.ip || req.connection?.remoteAddress || null;
          const userAgent = req.get('user-agent') || null;
          const resource = req.originalUrl || req.url;
          const method = req.method;
          const statusCode = res.statusCode;
          const isSuccess = statusCode >= 200 && statusCode < 400;

          await pool.query(
            \`INSERT INTO audit_log (user_id, user_role, action, resource, method, status_code, ip_address, user_agent, response_status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())\`,
            [userId, userRole, action, resource, method, statusCode, ipAddress, userAgent, isSuccess ? 'SUCCESS' : 'FAILURE']
          );
        } catch (err) {
          console.error('Audit log error:', err.message);
        }
      });
      originalEnd.apply(res, args);
    };
    next();
  };
};

/**
 * Standalone audit logger for use in controllers
 */
const logAuditEvent = async ({ userId, userRole, action, resource, method, statusCode, ipAddress, userAgent, details }) => {
  try {
    await pool.query(
      \`INSERT INTO audit_log (user_id, user_role, action, resource, method, status_code, ip_address, user_agent, request_body, response_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())\`,
      [userId || null, userRole || null, action, resource, method || null, statusCode || null, ipAddress || null, userAgent || null, details ? JSON.stringify(details).substring(0, 2000) : null, (statusCode >= 200 && statusCode < 400) ? 'SUCCESS' : 'FAILURE']
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

// Default export = middleware function (for app.use compatibility)
module.exports = auditMiddleware;
// Named exports
module.exports.auditLog = auditLog;
module.exports.logAuditEvent = logAuditEvent;
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
`);

// ============================================================
// STEP 5: Update authRoutes.js - add brute force + password strength
// ONLY on specific routes, NOT globally
// ============================================================
console.log('\nSTEP 5: Updating authRoutes.js with surgical middleware...\n');

writeFile('src/routes/authRoutes.js', `const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const { checkAccountLock } = require('../middleware/bruteForceProtection');
const { passwordStrengthCheck } = require('../middleware/passwordStrengthMiddleware');

// PUBLIC
router.post('/parent/send-otp', validate(schemas.sendOTP), AuthController.sendOTP);
router.post('/parent/verify-otp', validate(schemas.verifyOTP), AuthController.verifyOTP);
router.post('/personnel/login', checkAccountLock, validate(schemas.personnelLogin), AuthController.personnelLogin);
router.post('/refresh', AuthController.refreshToken);

// PROTECTED
router.post(
  '/parent/register',
  authenticate,
  passwordStrengthCheck,
  validate(schemas.registerParent),
  AuthController.registerParent,
);
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);
router.put(
  '/change-password',
  authenticate,
  passwordStrengthCheck,
  validate(schemas.changePassword),
  AuthController.changePassword,
);

module.exports = router;
`);

// ============================================================
// STEP 6: Fix passwordStrengthMiddleware - make it smarter
// ============================================================
console.log('\nSTEP 6: Updating passwordStrengthMiddleware...\n');

writeFile('src/middleware/passwordStrengthMiddleware.js', `'use strict';

/**
 * Password Strength Validation Middleware
 * Enforces strong password policies on registration and password change
 */

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password is required']
    };
  }
  
  const errors = [];
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(\`Password must be at least \${PASSWORD_REQUIREMENTS.minLength} characters long\`);
  }
  
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(\`Password must not exceed \${PASSWORD_REQUIREMENTS.maxLength} characters\`);
  }
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\\-=\\[\\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', 'Password1!', '12345678', 'qwerty123',
    'admin123', 'Admin123!', 'letmein1', 'welcome1'
  ];
  if (commonPasswords.some(cp => password.toLowerCase() === cp.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Password strength check middleware
 * Only validates when a password field is present in the body
 * Skips for login, refresh, logout routes
 */
const passwordStrengthCheck = (req, res, next) => {
  // Skip for login, refresh, logout - these don't set new passwords
  const path = req.path || '';
  if (path.includes('/login') || path.includes('/refresh') || path.includes('/logout') || path.includes('/send-otp') || path.includes('/verify-otp') || path.includes('/me')) {
    return next();
  }
  
  const { mot_de_passe, nouveau_mot_de_passe, newPassword, new_password } = req.body;
  // Check for the new password being set (not the old one being verified)
  const password = nouveau_mot_de_passe || newPassword || new_password || mot_de_passe;
  
  if (!password) {
    return next();
  }
  
  const validation = validatePasswordStrength(password);
  
  if (!validation.isValid) {
    return res.status(400).json({
      status: 'error',
      message: 'Password does not meet security requirements',
      errors: validation.errors
    });
  }
  
  next();
};

/**
 * Calculate password strength score (0-100)
 */
const getPasswordStrengthScore = (password) => {
  if (!password) return 0;
  
  let score = 0;
  score += Math.min(25, password.length * 2);
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\\d/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\\-=\\[\\]{}|;:,.<>?]/.test(password)) score += 15;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 5;
  const uniqueChars = new Set(password.split('')).size;
  score += Math.min(25, uniqueChars * 2);
  
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.some(cp => password.toLowerCase().includes(cp))) {
    score -= 30;
  }
  if (/(?:abc|bcd|cde|def|efg|123|234|345|456|567|678|789)/i.test(password)) {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
};

module.exports = {
  passwordStrengthCheck,
  validatePasswordStrength,
  getPasswordStrengthScore,
  PASSWORD_REQUIREMENTS
};
`);

// ============================================================
// STEP 7: Verify authController still has brute force tracking
// ============================================================
console.log('\nSTEP 7: Checking authController.js...\n');

const authCtrl = readFile('src/controllers/authController.js');

if (authCtrl.includes('handleFailedLogin') && authCtrl.includes('handleSuccessfulLogin')) {
  console.log('  ✅ authController already has brute force tracking');
  
  // Verify the import is correct
  if (authCtrl.includes("require('../middleware/bruteForceProtection')")) {
    console.log('  ✅ brute force import present');
  } else {
    console.log('  ⚠️ Missing brute force import - adding...');
    let fixed = authCtrl.replace(
      /(const .+ = require\(.+\);\n)/,
      "$1const { handleFailedLogin, handleSuccessfulLogin } = require('../middleware/bruteForceProtection');\n"
    );
    writeFile('src/controllers/authController.js', fixed);
  }
  
  // Verify handleFailedLogin is called on failed login
  if (authCtrl.includes('await handleFailedLogin(cin)') || authCtrl.includes('handleFailedLogin(cin)')) {
    console.log('  ✅ handleFailedLogin call present');
  } else {
    console.log('  ⚠️ Missing handleFailedLogin call on failed login');
  }
  
  // Verify handleSuccessfulLogin is called on successful login
  if (authCtrl.includes('await handleSuccessfulLogin(cin)') || authCtrl.includes('handleSuccessfulLogin(cin)')) {
    console.log('  ✅ handleSuccessfulLogin call present');
  } else {
    console.log('  ⚠️ Missing handleSuccessfulLogin call on successful login');
  }
} else {
  console.log('  ⚠️ authController missing brute force tracking');
}

// ============================================================
// STEP 8: Smoke test
// ============================================================
console.log('\nSTEP 8: Smoke test - does app.js load?\n');

const smokeTest = run('node -e "require(\'./src/app.js\'); console.log(\'APP LOADS OK\')" 2>&1');
console.log('  Result:', smokeTest.substring(0, 500));

if (smokeTest.includes('APP LOADS OK')) {
  console.log('  ✅ App loads successfully!');
} else {
  console.log('  ❌ App has load errors!');
  console.log(smokeTest);
}

// ============================================================
// STEP 9: Run the EXISTING test suite first (must pass before adding new tests)
// ============================================================
console.log('\nSTEP 9: Running EXISTING test suite (without new security tests)...\n');

const existingTestResult = run('npx jest --testPathIgnorePatterns=securityExtended --forceExit --detectOpenHandles 2>&1 | tail -30');
console.log(existingTestResult);

// Check results
const passMatch = existingTestResult.match(/Tests:\s+(\d+)\s+passed/);
const failMatch = existingTestResult.match(/(\d+)\s+failed/);
const totalMatch = existingTestResult.match(/(\d+)\s+total/);

const passed = passMatch ? parseInt(passMatch[1]) : 0;
const failed = failMatch ? parseInt(failMatch[1]) : 0;

console.log('\n============================================================');
if (failed === 0 && passed > 0) {
  console.log(`  ✅ EXISTING TESTS PASSED! (${passed}/${passed})`);
  console.log('  Now running with securityExtended tests too...\n');
  
  // Now run ALL tests including securityExtended
  const fullResult = run('npx jest --forceExit --detectOpenHandles 2>&1 | tail -40');
  console.log(fullResult);
  
  const fullPass = fullResult.match(/Tests:\s+(\d+)\s+passed/);
  const fullFail = fullResult.match(/(\d+)\s+failed/);
  const fullTotal = fullResult.match(/(\d+)\s+total/);
  
  if (fullFail && parseInt(fullFail[1]) > 0) {
    console.log(`\n  ❌ ${fullFail[1]} tests failed in full suite`);
  } else if (fullPass) {
    console.log(`\n  ✅ ALL ${fullPass[1]} TESTS PASSED!`);
  }
} else {
  console.log(`  ❌ ${failed} existing tests failed, ${passed} passed`);
  
  // Show which test suites failed
  const failedSuites = existingTestResult.match(/FAIL\s+\S+\.test\.js/g);
  if (failedSuites) {
    console.log('  Failed suites:', failedSuites.slice(0, 10));
  }
}
console.log('============================================================');
