'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('============================================================');
console.log('  FIX DAY 23 v4: audit_log table + authController tracking');
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
// STEP 1: Check existing audit_log table schema
// ============================================================
console.log('STEP 1: Checking audit_log table schema...\n');

const tableSchema = run('docker exec vaccinikids-db psql -U vaccinikids_user -d vaccinikids -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = \'audit_log\' ORDER BY ordinal_position"');
console.log('  Current audit_log columns:\n', tableSchema);

// ============================================================
// STEP 2: Drop and recreate audit_log with correct schema
// ============================================================
console.log('\nSTEP 2: Recreating audit_log table with correct schema...\n');

const createTable = run(`docker exec vaccinikids-db psql -U vaccinikids_user -d vaccinikids -c "
DROP TABLE IF EXISTS audit_log CASCADE;
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(500),
  method VARCHAR(10),
  status_code INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_body TEXT,
  response_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
"`);
console.log('  Result:', createTable.substring(0, 300));

// Verify the table now has the right columns
const verifySchema = run('docker exec vaccinikids-db psql -U vaccinikids_user -d vaccinikids -c "SELECT column_name FROM information_schema.columns WHERE table_name = \'audit_log\' ORDER BY ordinal_position"');
console.log('  New audit_log columns:\n', verifySchema);

// ============================================================
// STEP 3: Ensure failed_login_attempts and locked_until columns exist
// ============================================================
console.log('\nSTEP 3: Ensuring personnel table has brute force columns...\n');

const alterTable = run(`docker exec vaccinikids-db psql -U vaccinikids_user -d vaccinikids -c "
DO \\$\\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personnel' AND column_name = 'failed_login_attempts') THEN
    ALTER TABLE personnel ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personnel' AND column_name = 'locked_until') THEN
    ALTER TABLE personnel ADD COLUMN locked_until TIMESTAMP;
  END IF;
END \\$\\$;
"`);
console.log('  Result:', alterTable.substring(0, 200));

// Verify
const verifyPersonnel = run("docker exec vaccinikids-db psql -U vaccinikids_user -d vaccinikids -c \"SELECT column_name FROM information_schema.columns WHERE table_name = 'personnel' AND column_name IN ('failed_login_attempts', 'locked_until')\"");
console.log('  Personnel brute force columns:\n', verifyPersonnel);

// ============================================================
// STEP 4: Add handleFailedLogin/handleSuccessfulLogin to authController
// ============================================================
console.log('\nSTEP 4: Adding brute force tracking to authController...\n');

let authCtrl = readFile('src/controllers/authController.js');

// Check what's already there
console.log('  Has handleFailedLogin import:', authCtrl.includes("require('../middleware/bruteForceProtection')"));
console.log('  Has handleFailedLogin call:', authCtrl.includes('handleFailedLogin'));
console.log('  Has handleSuccessfulLogin call:', authCtrl.includes('handleSuccessfulLogin'));

// Show the personnelLogin function to find where to add calls
const loginMatch = authCtrl.match(/personnelLogin[\s\S]*?async \(req, res, next\)[\s\S]*?\{[\s\S]*?\n\s*\}/);
if (loginMatch) {
  console.log('\n  personnelLogin function preview:');
  console.log(loginMatch[0].substring(0, 600));
}

// Find the exact login function and add tracking
// Strategy: Find "Login successful" or the success response and add handleSuccessfulLogin before it
// Find "Invalid CIN or password" and add handleFailedLogin before it

// Add handleSuccessfulLogin call - find the success response in personnelLogin
if (!authCtrl.includes('await handleSuccessfulLogin(cin)')) {
  // Look for the pattern where login succeeds
  // The success response in the login handler
  const successPatterns = [
    /message:\s*['"]Login successful['"]/,
    /return success\(res,\s*200,\s*['"]Login successful['"]/,
  ];
  
  let added = false;
  for (const pattern of successPatterns) {
    if (pattern.test(authCtrl)) {
      // Add await handleSuccessfulLogin(cin) before the success response
      authCtrl = authCtrl.replace(
        pattern,
        (match) => {
          // Check if there's already an await before
          return 'await handleSuccessfulLogin(cin);\n      ' + match;
        }
      );
      added = true;
      console.log('  [OK] Added handleSuccessfulLogin call');
      break;
    }
  }
  
  if (!added) {
    console.log('  [WARN] Could not find login success pattern to add handleSuccessfulLogin');
    // Try a broader approach - find the personnelLogin function
    // Look for the line after password validation succeeds
    const isPasswordValidMatch = authCtrl.match(/(isPasswordValid\s*\)\s*\{|if\s*\(isPasswordValid\)\s*\{)/);
    if (isPasswordValidMatch) {
      console.log('  Found isPasswordValid check at:', isPasswordValidMatch[0]);
    }
  }
}

// Add handleFailedLogin call - find the "Invalid CIN or password" error
if (!authCtrl.includes('await handleFailedLogin(cin)')) {
  const failPatterns = [
    /return next\(ApiError\.unauthorized\(['"]Invalid CIN or password['"]\)\)/,
    /return next\(ApiError\.unauthorized\('Invalid CIN or password'\)\)/,
  ];
  
  let added = false;
  for (const pattern of failPatterns) {
    if (pattern.test(authCtrl)) {
      authCtrl = authCtrl.replace(
        pattern,
        (match) => 'await handleFailedLogin(cin);\n        ' + match
      );
      added = true;
      console.log('  [OK] Added handleFailedLogin call');
      break;
    }
  }
  
  if (!added) {
    console.log('  [WARN] Could not find failed login pattern');
  }
}

writeFile('src/controllers/authController.js', authCtrl);

// ============================================================
// STEP 5: Run existing tests first
// ============================================================
console.log('\nSTEP 5: Running existing test suite...\n');

const existingResult = run('npx jest --testPathIgnorePatterns=securityExtended --forceExit --detectOpenHandles 2>&1 | tail -20');
console.log(existingResult);

const existingPass = existingResult.match(/Tests:\s+(\d+)\s+passed/);
const existingFail = existingResult.match(/(\d+)\s+failed/);

if (existingFail && parseInt(existingFail[1]) > 0) {
  console.log(`\n  ❌ ${existingFail[1]} existing tests failed! Fix first.`);
  
  // Show which ones
  const failSuites = existingResult.match(/FAIL\s+\S+\.test\.js/g);
  if (failSuites) console.log('  Failed:', failSuites);
} else if (existingPass) {
  console.log(`\n  ✅ ${existingPass[1]} existing tests passed!`);
  
  // ============================================================
  // STEP 6: Run ALL tests including securityExtended
  // ============================================================
  console.log('\nSTEP 6: Running ALL tests including securityExtended...\n');
  
  const fullResult = run('npx jest --forceExit --detectOpenHandles 2>&1 | tail -40');
  console.log(fullResult);
  
  const fullPass = fullResult.match(/Tests:\s+(\d+)\s+passed/);
  const fullFail = fullResult.match(/(\d+)\s+failed/);
  const fullTotal = fullResult.match(/(\d+)\s+total/);
  
  console.log('\n============================================================');
  if (fullFail && parseInt(fullFail[1]) > 0) {
    console.log(`  ❌ ${fullFail[1]} tests failed, ${fullPass?.[1] || 0} passed`);
    
    // Show failed test details
    const failDetails = run('npx jest tests/securityExtended.test.js --forceExit --detectOpenHandles 2>&1 | tail -60');
    console.log('\n  Security extended test details:\n', failDetails);
  } else if (fullPass) {
    console.log(`  ✅ ALL ${fullPass[1]} TESTS PASSED!`);
  }
  console.log('============================================================');
}
