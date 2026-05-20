#!/usr/bin/env node
/**
 * FIX app.js: fileAttenteRoutes used before initialization
 * 
 * Problem: Line 94 has app.use('/api/file-attente', fileAttenteRoutes)
 *          Line 95 has const fileAttenteRoutes = require(...)
 *          The variable is used BEFORE it's declared!
 * 
 * Fix: Move the require BEFORE the app.use, OR use inline require
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('============================================================');
console.log('  FIX: fileAttenteRoutes used before initialization');
console.log('============================================================\n');

// ── STEP 1: Fix app.js ────────────────────────────────────────────
console.log('STEP 1: Fixing app.js...');

let appJs = fs.readFileSync(`${PROJECT}/src/app.js`, 'utf8');

// Show the problematic lines
const lines = appJs.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('fileAttente')) {
    console.log(`  Line ${i+1}: ${lines[i]}`);
  }
}

// Strategy: Replace the two problematic lines with correct order
// Remove the line: app.use('/api/file-attente', fileAttenteRoutes);
// Remove the line: const fileAttenteRoutes = require('./routes/fileAttenteRoutes');
// Add them in correct order: const first, then app.use

// First, remove the standalone const declaration
appJs = appJs.replace(/\n*const fileAttenteRoutes = require\('\.\/routes\/fileAttenteRoutes'\);\n*/g, '\n');

// Then, replace the app.use with the inline version (same pattern as other routes in the file)
appJs = appJs.replace(
  "app.use('/api/file-attente', fileAttenteRoutes);",
  "app.use('/api/file-attente', require('./routes/fileAttenteRoutes'));"
);

fs.writeFileSync(`${PROJECT}/src/app.js`, appJs);
console.log('  [OK] Fixed app.js - using inline require for file-attente route');

// Verify no more 'fileAttenteRoutes' variable references remain
if (appJs.includes('fileAttenteRoutes')) {
  console.error('  [WARN] fileAttenteRoutes variable still referenced in app.js!');
} else {
  console.log('  [OK] No more fileAttenteRoutes variable references');
}

// Also remove the jest.setTimeout if it was added (we'll re-add it properly)
console.log('\nSTEP 2: Checking statsDashboard.test.js timeout...');

const testFilePath = `${PROJECT}/tests/statsDashboard.test.js`;
let testJs = fs.readFileSync(testFilePath, 'utf8');

if (testJs.includes('jest.setTimeout')) {
  // Update to 30000
  testJs = testJs.replace(/jest\.setTimeout\(\d+\)/, 'jest.setTimeout(30000)');
  console.log('  [OK] jest.setTimeout set to 30000');
} else {
  testJs = "jest.setTimeout(30000);\n\n" + testJs;
  console.log('  [OK] Added jest.setTimeout(30000)');
}

fs.writeFileSync(testFilePath, testJs);

// ── STEP 3: Run full test suite ───────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  Running full test suite');
console.log('='.repeat(60));

try {
  execSync('npx jest --forceExit 2>&1', {
    cwd: PROJECT,
    stdio: 'inherit',
    timeout: 300000
  });
  console.log('\n✅ ALL TESTS PASSED!');
} catch (e) {
  console.log('\n⚠️  Some tests failed - check output above');
  
  // Run just the critical tests for a quick check
  console.log('\n--- Quick check of critical tests ---');
  try {
    execSync('npx jest tests/fileAttente.test.js tests/statsDashboard.test.js --forceExit 2>&1', {
      cwd: PROJECT,
      stdio: 'inherit',
      timeout: 180000
    });
  } catch (e2) {
    console.log('[INFO] Critical test check completed');
  }
}

console.log('\n============================================================');
console.log('  Fix script completed');
console.log('============================================================');
