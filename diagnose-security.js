'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('============================================================');
console.log('  DIAGNOSE: Current Security State');
console.log('============================================================\n');

// STEP 1: Check existing security files
console.log('STEP 1: Checking existing security-related files...');
const srcDir = path.join(PROJECT, 'src');
const testDir = path.join(PROJECT, 'tests');

function findFiles(dir, pattern) {
  try {
    return fs.readdirSync(dir).filter(f => pattern.test(f));
  } catch (e) { return []; }
}

const securityFiles = findFiles(srcDir, /security/i)
  .concat(findFiles(path.join(srcDir, 'middleware'), /security|auth|rbac|audit|rate/i))
  .concat(findFiles(path.join(srcDir, 'utils'), /security|sanitiz|valid/i));

console.log('  Security-related source files:', securityFiles);

const testFiles = findFiles(testDir, /security/i);
console.log('  Security test files:', testFiles);

// STEP 2: Check app.js for security middleware
console.log('\nSTEP 2: Checking app.js security configuration...');
const appJs = fs.readFileSync(path.join(PROJECT, 'src', 'app.js'), 'utf8');

const securityPatterns = [
  { name: 'helmet', pattern: /helmet/i },
  { name: 'cors', pattern: /cors/i },
  { name: 'rateLimit', pattern: /rateLimit|rate-limit/i },
  { name: 'express.json limit', pattern: /express\.json.*limit/i },
  { name: 'xss-clean', pattern: /xss|sanitiz/i },
  { name: 'mongo-sanitize', pattern: /mongo.*sanitiz/i },
  { name: 'hpp', pattern: /hpp/i },
  { name: 'auditMiddleware', pattern: /auditMiddleware/i },
  { name: 'apiLimiter', pattern: /apiLimiter/i },
  { name: 'authLimiter', pattern: /authLimiter/i },
];

securityPatterns.forEach(p => {
  const found = p.pattern.test(appJs);
  console.log(`  ${found ? '✅' : '❌'} ${p.name}: ${found ? 'FOUND' : 'NOT FOUND'}`);
});

// STEP 3: Check existing security middleware
console.log('\nSTEP 3: Checking security middleware directory...');
const middlewareDir = path.join(srcDir, 'middleware');
const middlewareFiles = fs.readdirSync(middlewareDir);
console.log('  Middleware files:', middlewareFiles);

middlewareFiles.forEach(f => {
  const content = fs.readFileSync(path.join(middlewareDir, f), 'utf8');
  const exports = content.match(/module\.exports\s*=\s*[\s\S]*$/m);
  if (exports) {
    console.log(`  ${f}: ${exports[0].substring(0, 80)}`);
  }
});

// STEP 4: Check existing security test
console.log('\nSTEP 4: Checking existing security.test.js...');
const secTestPath = path.join(testDir, 'security.test.js');
if (fs.existsSync(secTestPath)) {
  const secTest = fs.readFileSync(secTestPath, 'utf8');
  const testCount = (secTest.match(/it\(/g) || []).length;
  const describeCount = (secTest.match(/describe\(/g) || []).length;
  console.log(`  Tests: ${testCount}, Describe blocks: ${describeCount}`);
  
  // Extract test names
  const testNames = [...secTest.matchAll(/it\(['"](.*?)['"]/g)].map(m => m[1]);
  testNames.forEach(t => console.log(`    - ${t}`));
} else {
  console.log('  No security.test.js found');
}

// STEP 5: Check package.json for security dependencies
console.log('\nSTEP 5: Checking package.json dependencies...');
const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT, 'package.json'), 'utf8'));
const securityDeps = ['helmet', 'cors', 'express-rate-limit', 'xss-clean', 'express-mongo-sanitize', 'hpp', 'bcryptjs', 'jsonwebtoken'];
securityDeps.forEach(dep => {
  const installed = pkg.dependencies[dep] ? 'INSTALLED' : (pkg.devDependencies[dep] ? 'DEV' : 'NOT INSTALLED');
  console.log(`  ${dep}: ${installed}`);
});

// STEP 6: Check authController for brute force protection
console.log('\nSTEP 6: Checking authController for brute force protection...');
const authController = fs.readFileSync(path.join(srcDir, 'controllers', 'authController.js'), 'utf8');
const bfPatterns = [
  { name: 'Login attempts tracking', pattern: /login.*attempt|attempt.*count|tentative/i },
  { name: 'Account lockout', pattern: /lock|verrouill|bloqu/i },
  { name: 'Failed login counter', pattern: /failed.*login|login.*fail|compteur/i },
];
bfPatterns.forEach(p => {
  console.log(`  ${p.pattern.test(authController) ? '✅' : '❌'} ${p.name}`);
});

// STEP 7: Check validator for password strength
console.log('\nSTEP 7: Checking password validation...');
const validator = fs.readFileSync(path.join(srcDir, 'utils', 'validator.js'), 'utf8');
const pwdPatterns = [
  { name: 'Password strength check', pattern: /password.*strength|isStrongPassword|password.*valid/i },
  { name: 'Password complexity', pattern: /password.*length|password.*special|password.*upper|password.*lower/i },
];
pwdPatterns.forEach(p => {
  console.log(`  ${p.pattern.test(validator) ? '✅' : '❌'} ${p.name}`);
});

// Show all validator exports
const validatorExports = validator.match(/module\.exports[\s\S]*$/);
if (validatorExports) {
  console.log(`  Validator exports: ${validatorExports[0].substring(0, 200)}`);
}

// STEP 8: Check existing rate limiter config
console.log('\nSTEP 8: Checking rate limiter configuration...');
const rateLimitMatch = appJs.match(/rateLimit\([\s\S]*?\)/g);
if (rateLimitMatch) {
  rateLimitMatch.forEach((m, i) => {
    console.log(`  Rate limiter ${i + 1}: ${m.substring(0, 150)}...`);
  });
}

// Check if rate limiter is in a separate file
const rateLimitFiles = fs.readdirSync(srcDir).filter(f => /rate/i.test(f));
if (rateLimitFiles.length) {
  rateLimitFiles.forEach(f => {
    const content = fs.readFileSync(path.join(srcDir, f), 'utf8');
    console.log(`  ${f}:\n${content.substring(0, 500)}`);
  });
}

// STEP 9: Check existing middleware files for rate limiting
console.log('\nSTEP 9: Checking middleware for rate limiting...');
middlewareFiles.forEach(f => {
  const content = fs.readFileSync(path.join(middlewareDir, f), 'utf8');
  if (/rateLimit|rate.?limit/i.test(content)) {
    console.log(`  ${f} contains rate limiting`);
    console.log(`    ${content.substring(0, 300)}`);
  }
});

// STEP 10: Check audit middleware
console.log('\nSTEP 10: Checking audit middleware...');
const auditPath = path.join(middlewareDir, 'auditMiddleware.js');
if (fs.existsSync(auditPath)) {
  const auditContent = fs.readFileSync(auditPath, 'utf8');
  console.log(`  auditMiddleware.js exists (${auditContent.length} chars)`);
  console.log(`  First 500 chars:\n${auditContent.substring(0, 500)}`);
} else {
  console.log('  No auditMiddleware.js found');
}

// Also check for audit in app.js
const auditInApp = appJs.match(/audit[\s\S]*?Middleware/gi);
if (auditInApp) {
  console.log(`  Audit references in app.js:`, auditInApp);
}

console.log('\n============================================================');
console.log('  Diagnosis complete');
console.log('============================================================');
