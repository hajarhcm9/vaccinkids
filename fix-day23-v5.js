'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('============================================================');
console.log('  FIX DAY 23 v5: Fix authController + run tests');
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

function writeFile(relPath, content) {
  const fullPath = path.join(PROJECT, relPath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`  [OK] Wrote ${relPath}`);
}

// ============================================================
// STEP 1: Read current authController.js
// ============================================================
console.log('STEP 1: Reading authController.js...\n');

let authCtrl = readFile('src/controllers/authController.js');

// Show the personnelLogin function
const lines = authCtrl.split('\n');
const loginStartIdx = lines.findIndex(l => l.includes('personnelLogin:'));
console.log(`  personnelLogin starts at line ${loginStartIdx + 1}`);

// Show lines around the problem
for (let i = loginStartIdx; i < Math.min(loginStartIdx + 30, lines.length); i++) {
  console.log(`  ${i + 1}: ${lines[i]}`);
}

// ============================================================
// STEP 2: Fix the corrupted authController
// ============================================================
console.log('\nSTEP 2: Fixing authController...\n');

// Problem 1: Missing braces after handleFailedLogin
// The broken pattern:
//   if (!personnel) await handleFailedLogin(cin);
//           return next(ApiError.unauthorized('Invalid CIN or password'));
// Should be:
//   if (!personnel) { await handleFailedLogin(cin); return next(ApiError.unauthorized('Invalid CIN or password')); }

// Also check for duplicate handleFailedLogin calls (v4 ran twice)

// Fix: find ALL the broken patterns and fix them

// Pattern 1: if (!personnel) without braces
authCtrl = authCtrl.replace(
  /if \(!personnel\) await handleFailedLogin\(cin\);\s*\n\s*return next\(ApiError\.unauthorized\('Invalid CIN or password'\)\);/g,
  "if (!personnel) { await handleFailedLogin(cin); return next(ApiError.unauthorized('Invalid CIN or password')); }"
);

// Pattern 2: if there's a duplicate "await handleFailedLogin" on the same check
// (from running v4 twice)
const duplicateCheck = authCtrl.match(/await handleFailedLogin\(cin\);/g);
console.log(`  handleFailedLogin calls found: ${duplicateCheck ? duplicateCheck.length : 0}`);

const duplicateCheck2 = authCtrl.match(/await handleSuccessfulLogin\(cin\);/g);
console.log(`  handleSuccessfulLogin calls found: ${duplicateCheck2 ? duplicateCheck2.length : 0}`);

// If there are duplicates, we need a cleaner approach
// Let's restore authController from git and add the calls properly
console.log('\n  Restoring authController from git and adding calls properly...\n');

const gitAuthCtrl = run('git show 33626cd:src/controllers/authController.js 2>&1');

if (gitAuthCtrl.includes('fatal:')) {
  console.log('  ERROR: Cannot get git version');
  console.log(gitAuthCtrl.substring(0, 200));
} else {
  console.log('  Got clean authController from git');
  
  let cleanAuthCtrl = gitAuthCtrl;
  
  // Add the import at the top
  if (!cleanAuthCtrl.includes("require('../middleware/bruteForceProtection')")) {
    cleanAuthCtrl = cleanAuthCtrl.replace(
      "const bcrypt = require('bcrypt');",
      "const bcrypt = require('bcrypt');\nconst { handleFailedLogin, handleSuccessfulLogin } = require('../middleware/bruteForceProtection');"
    );
    console.log('  [OK] Added brute force import');
  }
  
  // Add handleFailedLogin on failed login (personnel not found OR wrong password)
  // Pattern 1: personnel not found
  cleanAuthCtrl = cleanAuthCtrl.replace(
    "if (!personnel) return next(ApiError.unauthorized('Invalid CIN or password'));",
    "if (!personnel) { await handleFailedLogin(cin); return next(ApiError.unauthorized('Invalid CIN or password')); }"
  );
  
  // Pattern 2: wrong password - find the second "Invalid CIN or password"
  // After replacing the first one, the second one is the password check
  // Check if there's a second "Invalid CIN or password" for wrong password
  const remainingUnauthorized = (cleanAuthCtrl.match(/Invalid CIN or password/g) || []).length;
  console.log(`  Remaining "Invalid CIN or password" occurrences: ${remainingUnauthorized}`);
  
  if (remainingUnauthorized > 1) {
    // Replace the second occurrence (wrong password case)
    // Find the second one specifically
    const firstIdx = cleanAuthCtrl.indexOf("Invalid CIN or password");
    const secondIdx = cleanAuthCtrl.indexOf("Invalid CIN or password", firstIdx + 1);
    
    if (secondIdx > -1) {
      // Find the full line containing the second occurrence
      const lineStart = cleanAuthCtrl.lastIndexOf('\n', secondIdx) + 1;
      const lineEnd = cleanAuthCtrl.indexOf('\n', secondIdx);
      const originalLine = cleanAuthCtrl.substring(lineStart, lineEnd);
      
      console.log(`  Second "Invalid CIN or password" line: ${originalLine.trim()}`);
      
      const fixedLine = originalLine.replace(
        /return next\(ApiError\.unauthorized\('Invalid CIN or password'\)\)/,
        "{ await handleFailedLogin(cin); return next(ApiError.unauthorized('Invalid CIN or password')); }"
      );
      
      cleanAuthCtrl = cleanAuthCtrl.substring(0, lineStart) + fixedLine + cleanAuthCtrl.substring(lineEnd);
      console.log('  [OK] Added handleFailedLogin for wrong password case');
    }
  }
  
  // Add handleSuccessfulLogin on successful login
  // Find the "Login successful" message
  if (cleanAuthCtrl.includes("message: 'Login successful'")) {
    cleanAuthCtrl = cleanAuthCtrl.replace(
      /(\s+)(message:\s*'Login successful')/,
      "$1await handleSuccessfulLogin(cin);\n$1$2"
    );
    console.log('  [OK] Added handleSuccessfulLogin call');
  } else if (cleanAuthCtrl.includes('"Login successful"')) {
    cleanAuthCtrl = cleanAuthCtrl.replace(
      /(\s+)(message:\s*"Login successful")/,
      "$1await handleSuccessfulLogin(cin);\n$1$2"
    );
    console.log('  [OK] Added handleSuccessfulLogin call (double quotes)');
  }
  
  writeFile('src/controllers/authController.js', cleanAuthCtrl);
}

// ============================================================
// STEP 3: Verify the fix
// ============================================================
console.log('\nSTEP 3: Verifying authController...\n');

const verifyCtrl = readFile('src/controllers/authController.js');
const loginIdx = verifyCtrl.indexOf('personnelLogin:');
const loginSection = verifyCtrl.substring(loginIdx, loginIdx + 800);
console.log('  personnelLogin function:');
loginSection.split('\n').forEach((line, i) => {
  console.log(`    ${i + 1}: ${line}`);
  if (i > 25) return; // Show first 25 lines
});

// Count the calls
const hflCount = (verifyCtrl.match(/await handleFailedLogin\(cin\)/g) || []).length;
const hslCount = (verifyCtrl.match(/await handleSuccessfulLogin\(cin\)/g) || []).length;
console.log(`\n  handleFailedLogin calls: ${hflCount} (expected: 2)`);
console.log(`  handleSuccessfulLogin calls: ${hslCount} (expected: 1)`);

// Check for the broken pattern (no braces)
const brokenPattern = /if \(!personnel\) await handleFailedLogin\(cin\);\s*\n\s*return next/;
if (brokenPattern.test(verifyCtrl)) {
  console.log('  ❌ STILL HAS BROKEN PATTERN (missing braces)!');
} else {
  console.log('  ✅ No broken patterns found');
}

// ============================================================
// STEP 4: Run tests (excluding securityExtended first)
// ============================================================
console.log('\nSTEP 4: Running existing tests...\n');

const result = run('npx jest --testPathIgnorePatterns=securityExtended --forceExit --detectOpenHandles 2>&1 | tail -25');
console.log(result);

const passMatch = result.match(/Tests:\s+(\d+)\s+passed/);
const failMatch = result.match(/(\d+)\s+failed/);

if (failMatch && parseInt(failMatch[1]) > 0) {
  console.log(`\n  ❌ ${failMatch[1]} tests failed!`);
  
  // Show which suites failed
  const failSuites = result.match(/FAIL\s+\S+\.test\.js/g);
  if (failSuites) console.log('  Failed suites:', failSuites);
  
  // Run auth tests specifically to debug
  console.log('\n  Running auth tests only for debug...');
  const authResult = run('npx jest tests/auth.test.js --forceExit --detectOpenHandles --no-cache 2>&1 | tail -40');
  console.log(authResult);
} else if (passMatch) {
  console.log(`\n  ✅ ${passMatch[1]} existing tests passed!`);
  
  // Now run ALL tests
  console.log('\n  Running ALL tests including securityExtended...\n');
  const fullResult = run('npx jest --forceExit --detectOpenHandles 2>&1 | tail -30');
  console.log(fullResult);
  
  const fullPass = fullResult.match(/Tests:\s+(\d+)\s+passed/);
  const fullFail = fullResult.match(/(\d+)\s+failed/);
  const fullTotal = fullResult.match(/(\d+)\s+total/);
  
  console.log('\n============================================================');
  if (fullFail && parseInt(fullFail[1]) > 0) {
    console.log(`  ❌ ${fullFail[1]} tests failed`);
  } else if (fullPass) {
    console.log(`  ✅ ALL ${fullPass[1]} TESTS PASSED!`);
  }
  console.log('============================================================');
}
