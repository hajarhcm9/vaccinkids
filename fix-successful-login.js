'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('============================================================');
console.log('  FIX: Add missing handleSuccessfulLogin');
console.log('============================================================\n');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { cwd: PROJECT, encoding: 'utf8', timeout: 180000, ...options });
  } catch (e) {
    return e.stdout || e.stderr || e.message;
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(PROJECT, relPath), 'utf8');
}

// Read current authController
let authCtrl = readFile('src/controllers/authController.js');

// Show the login success part
const loginIdx = authCtrl.indexOf('personnelLogin:');
const loginSection = authCtrl.substring(loginIdx, loginIdx + 1000);
console.log('Current personnelLogin function:');
loginSection.split('\n').forEach((line, i) => {
  console.log(`  ${i + 1}: ${line}`);
});

// Find where tokens are generated and add handleSuccessfulLogin BEFORE the success response
// The pattern is: const tokens = await TokenService.generateAuthTokens(...)
// Then: return success(res, 200, 'Login successful', {...})
// We need to add: await handleSuccessfulLogin(cin); BEFORE the return success line

if (!authCtrl.includes('await handleSuccessfulLogin(cin)')) {
  // Find "return success(res, 200, 'Login successful'" and add before it
  authCtrl = authCtrl.replace(
    /(return success\(res,\s*200,\s*'Login successful')/,
    "await handleSuccessfulLogin(cin);\n      $1"
  );
  console.log('\n  [OK] Added handleSuccessfulLogin call');
} else {
  console.log('\n  handleSuccessfulLogin already present');
}

fs.writeFileSync(path.join(PROJECT, 'src/controllers/authController.js'), authCtrl, 'utf8');

// Verify
const verifyCtrl = readFile('src/controllers/authController.js');
const hslCount = (verifyCtrl.match(/await handleSuccessfulLogin\(cin\)/g) || []).length;
const hflCount = (verifyCtrl.match(/await handleFailedLogin\(cin\)/g) || []).length;
console.log(`\n  handleFailedLogin calls: ${hflCount} (expected: 2)`);
console.log(`  handleSuccessfulLogin calls: ${hslCount} (expected: 1)`);

// Show the fixed section
const verifySection = verifyCtrl.substring(loginIdx, loginIdx + 1200);
console.log('\nFixed personnelLogin:');
verifySection.split('\n').forEach((line, i) => {
  console.log(`  ${i + 1}: ${line}`);
});

// Run tests
console.log('\n============================================================');
console.log('  Running tests...');
console.log('============================================================\n');

const result = run('npx jest --testPathIgnorePatterns=securityExtended --forceExit --detectOpenHandles 2>&1 | tail -15');
console.log(result);

const passMatch = result.match(/Tests:\s+(\d+)\s+passed/);
const failMatch = result.match(/(\d+)\s+failed/);

if (failMatch && parseInt(failMatch[1]) > 0) {
  console.log(`\n  ❌ ${failMatch[1]} tests failed`);
} else if (passMatch) {
  console.log(`\n  ✅ ${passMatch[1]} existing tests passed!`);
  
  // Run ALL tests
  console.log('\n  Running ALL tests...\n');
  const fullResult = run('npx jest --forceExit --detectOpenHandles 2>&1 | tail -15');
  console.log(fullResult);
}
