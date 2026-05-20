#!/usr/bin/env node
/**
 * FIX: statsDashboard.test.js flakiness
 * 
 * Problem: statsDashboard tests are FLAKY - sometimes pass, sometimes fail (23 tests)
 * All failures are "expect(received).toBe(expected)" which means tokens are likely undefined
 * or the stats routes are not working correctly.
 * 
 * Strategy:
 * 1. Read statsDashboard.test.js and app.js
 * 2. Diagnose the root cause
 * 3. Apply targeted fix
 * 4. Run just statsDashboard tests 3 times to confirm stability
 * 
 * Run: node fix-stats-flaky.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('='.repeat(60));
console.log('  FIX: statsDashboard.test.js flakiness');
console.log('='.repeat(60));

// ── STEP 1: Read and analyze statsDashboard.test.js ────────────
console.log('\nSTEP 1: Analyzing statsDashboard.test.js...');

const testPath = `${PROJECT}/tests/statsDashboard.test.js`;
const testCode = fs.readFileSync(testPath, 'utf8');

// Check for jest.setTimeout at the top
const lines = testCode.split('\n');
console.log('  First 5 lines:');
for (let i = 0; i < Math.min(5, lines.length); i++) {
  console.log('    ' + (i+1) + ': ' + lines[i]);
}

// Check beforeAll setup
const beforeAllMatch = testCode.match(/beforeAll\([\s\S]*?\}\);/);
if (beforeAllMatch) {
  console.log('\n  beforeAll block found (first 500 chars):');
  console.log('    ' + beforeAllMatch[0].substring(0, 500).replace(/\n/g, '\n    '));
}

// Check how tokens are created
const hasAdminToken = testCode.includes('adminToken');
const hasNurseToken = testCode.includes('nurseToken');
const hasParentToken = testCode.includes('parentToken');
console.log('\n  Has adminToken: ' + hasAdminToken);
console.log('  Has nurseToken: ' + hasNurseToken);
console.log('  Has parentToken: ' + hasParentToken);

// Check if tokens are declared with let (can be undefined)
const letAdminToken = testCode.includes('let adminToken');
const letNurseToken = testCode.includes('let nurseToken');
const letParentToken = testCode.includes('let parentToken');
console.log('  let adminToken: ' + letAdminToken);
console.log('  let nurseToken: ' + letNurseToken);
console.log('  let parentToken: ' + letParentToken);

// Count how many tests check status codes
const statusChecks = testCode.match(/\.status\)\.toBe\(\d+\)/g) || [];
console.log('\n  Status check assertions: ' + statusChecks.length);

// ── STEP 2: Read app.js for duplicate routes ───────────────────
console.log('\nSTEP 2: Checking app.js for duplicate routes...');

const appPath = `${PROJECT}/src/app.js`;
const appCode = fs.readFileSync(appPath, 'utf8');

// Find all route registrations
const routeLines = appCode.split('\n').filter(l => l.includes('app.use('));
console.log('  All route registrations:');
for (const line of routeLines) {
  console.log('    ' + line.trim());
}

// Check for duplicates
const routes = routeLines.map(l => l.match(/app\.use\(['"]([^'"]+)/)?.[1]).filter(Boolean);
const duplicates = routes.filter((r, i) => routes.indexOf(r) !== i);
if (duplicates.length > 0) {
  console.log('\n  ⚠️  DUPLICATE ROUTES FOUND: ' + [...new Set(duplicates)].join(', '));
} else {
  console.log('\n  No duplicate routes found');
}

// ── STEP 3: Run statsDashboard tests in ISOLATION ──────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 3: Running statsDashboard tests in isolation');
console.log('='.repeat(60));

try {
  const result = execSync('npx jest tests/statsDashboard.test.js --verbose --forceExit 2>&1', {
    cwd: PROJECT,
    timeout: 180000,
    maxBuffer: 5 * 1024 * 1024,
    encoding: 'utf8'
  });
  
  // Count passes/fails
  const passMatch = result.match(/Tests:\s+(\d+) passed/);
  const failMatch = result.match(/(\d+) failed/);
  const passed = passMatch ? passMatch[1] : '?';
  const failed = failMatch ? failMatch[1] : '0';
  
  console.log('  Result: ' + passed + ' passed, ' + failed + ' failed');
  
  // Show failing tests
  const failLines = result.split('\n').filter(l => l.includes('✕') || l.includes('×'));
  if (failLines.length > 0) {
    console.log('\n  Failed tests:');
    for (const f of failLines) console.log('    ' + f.trim());
  }
  
  // Show error details
  const errorSections = [];
  let inError = false;
  let errorBuf = [];
  for (const line of result.split('\n')) {
    if (line.trim().startsWith('●')) {
      inError = true;
      errorBuf = [];
    }
    if (inError) {
      errorBuf.push(line);
      if (line.trim() === '' && errorBuf.length > 3) {
        errorSections.push(errorBuf.join('\n'));
        inError = false;
        errorBuf = [];
      }
    }
  }
  if (inError) errorSections.push(errorBuf.join('\n'));
  
  if (errorSections.length > 0) {
    console.log('\n  Error details (first 3):');
    for (let i = 0; i < Math.min(3, errorSections.length); i++) {
      console.log(errorSections[i].substring(0, 400));
      console.log('  ---');
    }
  }
  
} catch (e) {
  const output = (e.stdout || '').toString();
  const failLines = output.split('\n').filter(l => l.includes('✕') || l.includes('×'));
  console.log('  Failed tests:');
  for (const f of failLines) console.log('    ' + f.trim());
  
  // Show first few errors
  let inError = false;
  let errorBuf = [];
  let errorCount = 0;
  for (const line of output.split('\n')) {
    if (line.trim().startsWith('●')) {
      inError = true;
      errorBuf = [];
      errorCount++;
    }
    if (inError) {
      errorBuf.push(line);
      if (line.trim() === '' && errorBuf.length > 3) {
        if (errorCount <= 3) console.log(errorBuf.join('\n').substring(0, 500));
        inError = false;
        errorBuf = [];
      }
    }
  }
}

// ── STEP 4: Read the full test file for deeper analysis ────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 4: Deep analysis of statsDashboard.test.js');
console.log('='.repeat(60));

// Show the describe blocks and their beforeAll/afterAll
const describeBlocks = testCode.match(/describe\([\s\S]*?\{/g) || [];
console.log('  describe blocks found: ' + describeBlocks.length);

// Show structure: describe > describe > it
const structure = [];
let indent = 0;
for (const line of testCode.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('describe(') || trimmed.startsWith('it(') || trimmed.startsWith('test(')) {
    const name = trimmed.match(/['"]([^'"]+)/)?.[1] || trimmed.substring(0, 60);
    console.log('    ' + '  '.repeat(indent) + name);
    if (trimmed.startsWith('describe(')) indent++;
  }
  if (trimmed === '});' && indent > 0) indent--;
}

// ── STEP 5: Check if the issue is with statsController/route ──
console.log('\n' + '='.repeat(60));
console.log('  STEP 5: Checking stats route and controller');
console.log('='.repeat(60));

const statsRoutePath = `${PROJECT}/src/routes/statsRoutes.js`;
const statsControllerPath = `${PROJECT}/src/controllers/statsController.js`;

if (fs.existsSync(statsRoutePath)) {
  const routeCode = fs.readFileSync(statsRoutePath, 'utf8');
  console.log('  statsRoutes.js exists (' + routeCode.length + ' bytes)');
  // Show route definitions
  const routeDefs = routeCode.split('\n').filter(l => l.includes('router.'));
  console.log('  Route definitions:');
  for (const r of routeDefs) console.log('    ' + r.trim());
} else {
  console.log('  ⚠️  statsRoutes.js NOT FOUND');
}

if (fs.existsSync(statsControllerPath)) {
  const ctrlCode = fs.readFileSync(statsControllerPath, 'utf8');
  console.log('  statsController.js exists (' + ctrlCode.length + ' bytes)');
} else {
  console.log('  ⚠️  statsController.js NOT FOUND');
}

// ── STEP 6: Read the COMPLETE statsDashboard.test.js ──────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 6: Full file dump (for remote analysis)');
console.log('='.repeat(60));

// Print first 150 lines
console.log('\n--- First 150 lines of statsDashboard.test.js ---');
const testLines = testCode.split('\n');
for (let i = 0; i < Math.min(150, testLines.length); i++) {
  console.log((i+1).toString().padStart(4) + ': ' + testLines[i]);
}

// Print last 50 lines
if (testLines.length > 150) {
  console.log('\n--- Last 50 lines ---');
  for (let i = Math.max(150, testLines.length - 50); i < testLines.length; i++) {
    console.log((i+1).toString().padStart(4) + ': ' + testLines[i]);
  }
}

console.log('\n\nTotal lines: ' + testLines.length);
console.log('\nDone. Share this output for targeted fix.');
