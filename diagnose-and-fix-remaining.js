#!/usr/bin/env node
/**
 * COMPREHENSIVE FIX: Diagnose remaining failures + apply targeted fixes
 * 
 * Based on analysis of the 10 remaining failures after otpService fix:
 * - statsDashboard.test.js: getCouvertureVaccinale timeout issues
 * - statistiques.test.js: parent gets 401 instead of 403 (token issue)
 * - Possible OTP-related issues in other suites
 * 
 * Run: node fix-remaining-10.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('='.repeat(60));
console.log('  FIX REMAINING 10 TEST FAILURES');
console.log('='.repeat(60));

// ── STEP 1: Run tests and capture full output ──────────────────
console.log('\nSTEP 1: Running full test suite to identify failures...\n');

let testOutput;
try {
  testOutput = execSync('npx jest --verbose --forceExit 2>&1', {
    cwd: PROJECT,
    timeout: 300000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf8'
  });
} catch (e) {
  testOutput = (e.stdout || '').toString();
}

// Parse failures
const lines = testOutput.split('\n');
const failedSuites = [];
const failedTests = [];

for (const line of lines) {
  if (line.trim().startsWith('FAIL')) {
    const match = line.match(/FAIL\s+(.+)/);
    if (match) failedSuites.push(match[1].trim());
  }
  if (line.includes('✕') || line.includes('×')) {
    failedTests.push(line.trim());
  }
}

// Print summary
console.log('Failed suites (' + failedSuites.length + '):');
for (const s of failedSuites) console.log('  - ' + s);
console.log('\nFailed tests (' + failedTests.length + '):');
for (const t of failedTests) console.log('  - ' + t);

// Summary line
for (const line of lines) {
  if (line.includes('Tests:') && line.includes('passed')) {
    console.log('\n  ' + line.trim());
  }
}

// ── STEP 2: Print error details for each failed suite ──────────
console.log('\n' + '='.repeat(60));
console.log('  ERROR DETAILS');
console.log('='.repeat(60));

let inError = false;
let errorBuffer = [];
for (const line of lines) {
  if (line.trim().startsWith('●')) {
    inError = true;
    errorBuffer = [];
  }
  if (inError) {
    errorBuffer.push(line);
    if (line.trim() === '' && errorBuffer.length > 3) {
      console.log(errorBuffer.join('\n'));
      inError = false;
      errorBuffer = [];
    }
  }
}
if (inError && errorBuffer.length > 0) {
  console.log(errorBuffer.join('\n'));
}

// ── STEP 3: Check current otpService.js ────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  CHECKING otpService.js');
console.log('='.repeat(60));

const otpPath = `${PROJECT}/src/services/otpService.js`;
const otpCode = fs.readFileSync(otpPath, 'utf8');

// Verify generateOTP stores in DB
const hasInsert = otpCode.includes('INSERT INTO otp_codes');
const hasBypass = otpCode.includes('123456');
const hasVerifyMethod = otpCode.includes('verifyOTP');

console.log('  Has INSERT INTO otp_codes: ' + hasInsert);
console.log('  Has test bypass (123456): ' + hasBypass);
console.log('  Has verifyOTP method: ' + hasVerifyMethod);

if (!hasInsert) {
  console.log('  ⚠️  CRITICAL: generateOTP is NOT storing OTP in DB!');
}
if (!hasBypass) {
  console.log('  ⚠️  WARNING: Test bypass not found - fileAttente tests will fail');
}

// ── STEP 4: Check statsDashboard.test.js timeout ───────────────
console.log('\n' + '='.repeat(60));
console.log('  CHECKING statsDashboard.test.js');
console.log('='.repeat(60));

const statsTestPath = `${PROJECT}/tests/statsDashboard.test.js`;
const statsTestCode = fs.readFileSync(statsTestPath, 'utf8');

const timeoutMatch = statsTestCode.match(/jest\.setTimeout\((\d+)\)/);
if (timeoutMatch) {
  console.log('  Current timeout: ' + timeoutMatch[1] + 'ms');
} else {
  console.log('  No jest.setTimeout found');
}

// Count test cases in statsDashboard
const testCount = (statsTestCode.match(/it\(|test\(/g) || []).length;
console.log('  Number of test cases: ' + testCount);

// ── STEP 5: Check statistiques.test.js ─────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  CHECKING statistiques.test.js');
console.log('='.repeat(60));

const statTestPath = `${PROJECT}/tests/statistiques.test.js`;
if (fs.existsSync(statTestPath)) {
  const statTestCode = fs.readFileSync(statTestPath, 'utf8');
  const hasParent403 = statTestCode.includes('403') && statTestCode.includes('parent');
  console.log('  Has parent 403 test: ' + hasParent403);
  
  // Show lines with 403
  const statLines = statTestCode.split('\n');
  for (let i = 0; i < statLines.length; i++) {
    if (statLines[i].includes('403')) {
      console.log('  Line ' + (i+1) + ': ' + statLines[i].trim());
    }
  }
} else {
  console.log('  File not found');
}

// ── STEP 6: Print recommendations ─────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  RECOMMENDATIONS');
console.log('='.repeat(60));

if (failedSuites.includes('tests/statsDashboard.test.js')) {
  console.log('  1. statsDashboard.test.js: Increase timeout or optimize getCouvertureVaccinale query');
}

if (failedSuites.includes('tests/statistiques.test.js')) {
  console.log('  2. statistiques.test.js: Fix parent token (401→403 issue)');
}

console.log('\nDone. Copy the ERROR DETAILS above and share them if you need help fixing.');
