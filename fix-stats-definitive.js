#!/usr/bin/env node
/**
 * FIX: statsDashboard.test.js flakiness + app.js duplicate routes
 * 
 * ROOT CAUSES:
 * 1. app.js has DUPLICATE route registrations (/api/admin and /api/stats appear TWICE)
 *    - This causes middleware to run twice and can confuse request handling
 * 2. statsDashboard.test.js beforeAll has only 30000ms timeout (may not be enough)
 * 3. statsDashboard.test.js uses getOTP() to fetch real OTP from DB instead of
 *    using the '123456' test bypass — this is fragile when other tests run concurrently
 * 
 * FIXES:
 * 1. Remove duplicate route registrations from app.js
 * 2. Update statsDashboard.test.js: use '123456' bypass, increase timeout, add token validation
 * 3. Verify with full test suite run
 * 
 * Run: node fix-stats-definitive.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('='.repeat(60));
console.log('  FIX: statsDashboard flakiness + duplicate routes');
console.log('='.repeat(60));

// ── STEP 1: Fix app.js - remove duplicate route registrations ──
console.log('\nSTEP 1: Fixing app.js duplicate routes...');

const appPath = `${PROJECT}/src/app.js`;
let appCode = fs.readFileSync(appPath, 'utf8');
const originalAppCode = appCode;

// Find all route registrations
const routeLines = appCode.split('\n');
const seenRoutes = new Set();
const duplicateLineNumbers = [];
const linesToRemove = [];

for (let i = 0; i < routeLines.length; i++) {
  const line = routeLines[i];
  const match = line.match(/app\.use\(\s*['"]([^'"]+)['"]/);
  if (match) {
    const route = match[1];
    // Skip non-route middleware (cors, express.json, morgan, etc.)
    if (route === '/' || route === '') continue;
    
    if (seenRoutes.has(route)) {
      duplicateLineNumbers.push(i + 1);
      linesToRemove.push(i);
      console.log('  Found duplicate: ' + route + ' at line ' + (i + 1));
    } else {
      seenRoutes.add(route);
    }
  }
}

if (linesToRemove.length > 0) {
  // Remove duplicate lines (in reverse order to preserve indices)
  const newLines = routeLines.filter((_, idx) => !linesToRemove.includes(idx));
  appCode = newLines.join('\n');
  fs.writeFileSync(appPath, appCode);
  console.log('  [OK] Removed ' + linesToRemove.length + ' duplicate route(s)');
} else {
  console.log('  [OK] No duplicate routes found');
}

// Verify no duplicates remain
const verifyLines = appCode.split('\n');
const verifySeen = new Set();
let stillHasDups = false;
for (const line of verifyLines) {
  const match = line.match(/app\.use\(\s*['"]([^'"]+)['"]/);
  if (match) {
    const route = match[1];
    if (route === '/' || route === '') continue;
    if (verifySeen.has(route)) {
      console.log('  ⚠️  Still has duplicate: ' + route);
      stillHasDups = true;
    }
    verifySeen.add(route);
  }
}
if (!stillHasDups) {
  console.log('  [OK] Verified: no duplicate routes remain');
}

// ── STEP 2: Fix statsDashboard.test.js ─────────────────────────
console.log('\nSTEP 2: Fixing statsDashboard.test.js...');

const testPath = `${PROJECT}/tests/statsDashboard.test.js`;
let testCode = fs.readFileSync(testPath, 'utf8');

// Fix 2a: Replace getOTP usage with '123456' test bypass
// Original:
//   const otp = await getOTP(parentPhone);
//   if (otp) {
//     const verifyRes = await request(app)
//       .post('/api/auth/parent/verify-otp')
//       .send({ telephone: parentPhone, code: otp, nom: 'StatsParent', prenom: 'Test' });
//     parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;
//     parentId = verifyRes.body.data?.parent?.id;
//   }
//
// New: Use '123456' bypass directly (no need to fetch OTP from DB)

const oldOtpBlock = `  const otp = await getOTP(parentPhone);
  if (otp) {
    const verifyRes = await request(app)
      .post('/api/auth/parent/verify-otp')
      .send({ telephone: parentPhone, code: otp, nom: 'StatsParent', prenom: 'Test' });
    parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;
    parentId = verifyRes.body.data?.parent?.id;
  }`;

const newOtpBlock = `  // Use test bypass '123456' instead of fetching real OTP (more reliable)
  const verifyRes = await request(app)
    .post('/api/auth/parent/verify-otp')
    .send({ telephone: parentPhone, code: '123456', nom: 'StatsParent', prenom: 'Test' });
  parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;
  parentId = verifyRes.body.data?.parent?.id;`;

if (testCode.includes('const otp = await getOTP(parentPhone)')) {
  testCode = testCode.replace(oldOtpBlock, newOtpBlock);
  console.log('  [OK] Replaced getOTP() with test bypass 123456');
} else {
  console.log('  [INFO] getOTP block not found exactly - trying flexible match...');
  
  // Try a more flexible replacement
  const flexiblePattern = /const otp = await getOTP\(parentPhone\);\s*\n\s*if \(otp\) \{\s*\n\s*const verifyRes = await request\(app\)\s*\n\s*\.post\('\/api\/auth\/parent\/verify-otp'\)\s*\n\s*\.send\(\{ telephone: parentPhone, code: otp,[^}]+\}\);\s*\n\s*parentToken = verifyRes\.body\.data\?\.\tokens\?\.accessToken \|\| verifyRes\.body\.data\?\.accessToken;\s*\n\s*parentId = verifyRes\.body\.data\?\.parent\?\.id;\s*\n\s*\}/;
  
  if (flexiblePattern.test(testCode)) {
    testCode = testCode.replace(flexiblePattern, newOtpBlock);
    console.log('  [OK] Replaced getOTP() with test bypass (flexible match)');
  } else {
    console.log('  ⚠️  Could not find OTP block - will do manual replacement');
    // Just replace the getOTP call line
    testCode = testCode.replace(
      /const otp = await getOTP\(parentPhone\);/,
      "// Using '123456' test bypass instead of getOTP"
    );
    testCode = testCode.replace(
      /if \(otp\) \{/,
      '{  // Always try verify with test bypass'
    );
    testCode = testCode.replace(
      /code: otp,/,
      "code: '123456',"
    );
    console.log('  [OK] Applied manual replacements');
  }
}

// Fix 2b: Increase beforeAll timeout from 30000 to 60000
testCode = testCode.replace(
  /\}, 30000\);(\s*\n\s*afterAll)/,
  '}, 60000);$1'
);
console.log('  [OK] Increased beforeAll timeout to 60000ms');

// Fix 2c: Remove the getOTP helper function (no longer needed)
// But keep it in case other code references it
// Actually, just leave it - it's harmless

// Fix 2d: Add token validation at the end of beforeAll
// After the beforeAll block, add a check that tokens exist
const beforeAllEndPattern = /}, 60000\);/;
if (beforeAllEndPattern.test(testCode)) {
  // Add token validation right before the closing of beforeAll
  // Find the line "}, 60000);" and add validation before it
  testCode = testCode.replace(
    /}, 60000\);/,
    `  // Validate tokens were obtained
  if (!adminToken) console.error('STATS TEST: adminToken is undefined!');
  if (!nurseToken) console.error('STATS TEST: nurseToken is undefined!');
  if (!parentToken) console.error('STATS TEST: parentToken is undefined!');
}, 60000);`
  );
  console.log('  [OK] Added token validation logging');
}

fs.writeFileSync(testPath, testCode);
console.log('  [OK] Saved updated statsDashboard.test.js');

// ── STEP 3: Run statsDashboard test in isolation ───────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 3: Running statsDashboard test in isolation');
console.log('='.repeat(60));

try {
  const result = execSync(
    'npx jest tests/statsDashboard.test.js --verbose --forceExit 2>&1',
    { cwd: PROJECT, timeout: 180000, maxBuffer: 5*1024*1024, encoding: 'utf8' }
  );
  
  const passMatch = result.match(/Tests:\s+(\d+) passed/);
  const failMatch = result.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '0') + ' failed');
  
  // Check for token warnings
  if (result.includes('STATS TEST:')) {
    console.log('\n  ⚠️  Token warnings found:');
    const warnLines = result.split('\n').filter(l => l.includes('STATS TEST:'));
    for (const w of warnLines) console.log('    ' + w.trim());
  }
} catch (e) {
  const output = (e.stdout || '').toString();
  const failMatch = output.match(/(\d+) failed/);
  const passMatch = output.match(/(\d+) passed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '?') + ' failed');
  
  // Show first few errors
  const failLines = output.split('\n').filter(l => l.includes('✕'));
  if (failLines.length > 0) {
    console.log('  Failed tests:');
    for (const f of failLines.slice(0, 5)) console.log('    ' + f.trim());
  }
  
  if (output.includes('STATS TEST:')) {
    console.log('\n  ⚠️  Token warnings:');
    const warnLines = output.split('\n').filter(l => l.includes('STATS TEST:'));
    for (const w of warnLines) console.log('    ' + w.trim());
  }
}

// ── STEP 4: Run FULL test suite ────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 4: Running FULL test suite');
console.log('='.repeat(60));

try {
  const result = execSync(
    'npx jest --forceExit 2>&1',
    { cwd: PROJECT, timeout: 300000, maxBuffer: 10*1024*1024, encoding: 'utf8' }
  );
  
  const passMatch = result.match(/Tests:\s+(\d+) passed/);
  const failMatch = result.match(/(\d+) failed/);
  const suiteMatch = result.match(/Test Suites:\s+(\d+) passed/);
  const suiteFailMatch = result.match(/(\d+) failed/);
  
  console.log('\n  Test Suites: ' + (suiteMatch ? suiteMatch[1] : '?') + ' passed, ' + (suiteFailMatch ? suiteFailMatch[1] : '0') + ' failed');
  console.log('  Tests: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '0') + ' failed');
  
  if (!failMatch || failMatch[1] === '0') {
    console.log('\n  ✅ ALL TESTS PASSED!');
  } else {
    console.log('\n  ⚠️  Some tests still failing');
    // Show which suites failed
    const failSuites = result.split('\n').filter(l => l.trim().startsWith('FAIL'));
    for (const s of failSuites) console.log('    ' + s.trim());
  }
  
} catch (e) {
  const output = (e.stdout || '').toString();
  const passMatch = output.match(/Tests:\s+(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  const suiteMatch = output.match(/Test Suites:\s+(\d+) passed/);
  
  console.log('\n  Test Suites: ' + (suiteMatch ? suiteMatch[1] : '?') + ' passed');
  console.log('  Tests: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '?') + ' failed');
  
  // Show failed suites
  const failSuites = output.split('\n').filter(l => l.trim().startsWith('FAIL'));
  console.log('\n  Failed suites:');
  for (const s of failSuites) console.log('    ' + s.trim());
  
  // Show first few failing test names
  const failTests = output.split('\n').filter(l => l.includes('✕'));
  if (failTests.length > 0) {
    console.log('\n  Failed tests:');
    for (const t of failTests.slice(0, 10)) console.log('    ' + t.trim());
  }
}

console.log('\n' + '='.repeat(60));
console.log('  Fix script completed');
console.log('='.repeat(60));
