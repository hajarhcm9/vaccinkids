#!/usr/bin/env node
/**
 * DIAGNOSE: Show actual status codes + fix exportController import
 * 
 * Run: node diagnose-export.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('='.repeat(60));
console.log('  DIAGNOSE: Export test failures');
console.log('='.repeat(60));

// ── STEP 1: Read the ACTUAL current exportController.js ────────
console.log('\nSTEP 1: Current exportController.js first 10 lines:');

const ctrlPath = `${PROJECT}/src/controllers/exportController.js`;
const ctrlCode = fs.readFileSync(ctrlPath, 'utf8');
const ctrlLines = ctrlCode.split('\n');
for (let i = 0; i < Math.min(15, ctrlLines.length); i++) {
  console.log('  ' + (i+1) + ': ' + ctrlLines[i]);
}

// Check if pool variable is properly declared
const poolVarDecl = ctrlCode.match(/const\s+(?:\{\s*pool\s*\}|pool)\s*=\s*require/);
console.log('\n  Pool variable declaration found: ' + !!poolVarDecl);
if (poolVarDecl) console.log('  Declaration: ' + poolVarDecl[0]);

// Check if pool.query is used
const poolQueryCount = (ctrlCode.match(/pool\.query/g) || []).length;
console.log('  pool.query calls: ' + poolQueryCount);

// ── STEP 2: Read the database.js exports ───────────────────────
console.log('\nSTEP 2: database.js exports:');

const dbPath = `${PROJECT}/src/config/database.js`;
const dbCode = fs.readFileSync(dbPath, 'utf8');
const exportLine = dbCode.match(/module\.exports\s*=\s*\{[^}]+\}/)?.[0];
console.log('  ' + exportLine);

// Check if pool is a real pg Pool
const poolType = dbCode.includes('new Pool') ? 'pg Pool object' : 'unknown';
console.log('  Pool type: ' + poolType);

// ── STEP 3: Check fileAttenteService.js for comparison ─────────
console.log('\nSTEP 3: fileAttenteService.js first 5 lines:');

const faPath = `${PROJECT}/src/services/fileAttenteService.js`;
const faCode = fs.readFileSync(faPath, 'utf8');
const faLines = faCode.split('\n');
for (let i = 0; i < Math.min(5, faLines.length); i++) {
  console.log('  ' + (i+1) + ': ' + faLines[i]);
}

// How does fileAttenteService call query?
const faQueryCalls = (faCode.match(/pool\.query/g) || []).length;
console.log('  fileAttenteService pool.query calls: ' + faQueryCalls);

// ── STEP 4: Fix the import if needed ───────────────────────────
console.log('\nSTEP 4: Fixing exportController.js import if needed...');

// The correct pattern: const pool = require('../config/database').pool;
// This gets the pool property (which is a pg Pool) from the exports
// Then pool.query() works correctly

// Check what the current import line looks like
let currentImportLine = '';
for (const line of ctrlLines) {
  if (line.includes('require') && line.includes('database')) {
    currentImportLine = line.trim();
    break;
  }
}
console.log('  Current import line: ' + currentImportLine);

// Fix it properly
const correctImport = "const pool = require('../config/database').pool;";

if (currentImportLine !== correctImport) {
  // Replace the import line
  let newCtrlCode = ctrlCode;
  
  // Find and replace the line with 'require' and 'database'
  for (let i = 0; i < ctrlLines.length; i++) {
    if (ctrlLines[i].includes('require') && ctrlLines[i].includes('database')) {
      // Replace the entire line
      newCtrlCode = newCtrlCode.replace(ctrlLines[i], correctImport);
      console.log('  Replaced line ' + (i+1) + ': ' + ctrlLines[i].trim() + ' → ' + correctImport);
      break;
    }
  }
  
  fs.writeFileSync(ctrlPath, newCtrlCode);
  console.log('  [OK] Fixed import');
} else {
  console.log('  [OK] Import already correct');
}

// ── STEP 5: Quick manual test of the export endpoint ───────────
console.log('\nSTEP 5: Quick test - hitting export endpoint directly...');

try {
  // First get a token by logging in as ADMIN01
  const testScript = `
    const request = require('supertest');
    const app = require('./src/app');
    
    (async () => {
      // Login
      const login = await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
      
      const token = login.body.data?.tokens?.accessToken;
      console.log('Login status:', login.status);
      console.log('Token:', token ? 'OK (' + token.substring(0, 20) + '...)' : 'UNDEFINED');
      console.log('Login body:', JSON.stringify(login.body).substring(0, 300));
      
      if (token) {
        // Test export endpoint
        const exportRes = await request(app)
          .get('/api/exports/vaccinations/pdf')
          .set('Authorization', 'Bearer ' + token);
        console.log('Export status:', exportRes.status);
        console.log('Export content-type:', exportRes.headers['content-type']);
        console.log('Export body preview:', JSON.stringify(exportRes.body || '').substring(0, 300));
      }
      
      process.exit(0);
    })().catch(e => { console.error(e.message); process.exit(1); });
  `;
  
  fs.writeFileSync(`${PROJECT}/_quick_test.js`, testScript);
  
  const result = execSync('node _quick_test.js 2>&1', {
    cwd: PROJECT,
    timeout: 30000,
    encoding: 'utf8'
  });
  console.log(result);
  
  // Cleanup
  fs.unlinkSync(`${PROJECT}/_quick_test.js`);
} catch (e) {
  const output = (e.stdout || '').toString();
  console.log(output || e.message);
  
  // Cleanup
  try { fs.unlinkSync(`${PROJECT}/_quick_test.js`); } catch(e2) {}
}

// ── STEP 6: Run export tests with verbose output ───────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 6: Running export tests');
console.log('='.repeat(60));

try {
  const result = execSync(
    'npx jest tests/export.test.js --verbose --forceExit 2>&1',
    { cwd: PROJECT, timeout: 120000, maxBuffer: 5*1024*1024, encoding: 'utf8' }
  );
  
  const passMatch = result.match(/Tests:\s+(\d+) passed/);
  const failMatch = result.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '0') + ' failed');
  
  if (!failMatch || failMatch[1] === '0') {
    console.log('\n  ✅ Export tests PASSED!');
  }
} catch (e) {
  const output = (e.stdout || '').toString();
  const passMatch = output.match(/Tests:\s+(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '?') + ' failed');
  
  // Show token warnings
  if (output.includes('EXPORT:')) {
    const warnLines = output.split('\n').filter(l => l.includes('EXPORT:'));
    for (const w of warnLines.slice(0, 3)) console.log('    ' + w.trim().substring(0, 200));
  }
  
  // Show failing tests
  const failLines = output.split('\n').filter(l => l.includes('✕'));
  if (failLines.length > 0) {
    console.log('\n  Failed tests:');
    for (const f of failLines) console.log('    ' + f.trim());
  }
}

// ── STEP 7: Full suite ─────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 7: Full test suite');
console.log('='.repeat(60));

try {
  const result = execSync(
    'npx jest --forceExit 2>&1',
    { cwd: PROJECT, timeout: 300000, maxBuffer: 10*1024*1024, encoding: 'utf8' }
  );
  const summary = result.split('\n').filter(l => 
    l.includes('Test Suites:') || l.includes('Tests:')
  );
  for (const s of summary) console.log('  ' + s.trim());
  
  if (!result.includes(' failed') || result.match(/Tests:\s+0 failed/)) {
    console.log('\n  ✅ ALL TESTS PASSED!');
  }
} catch (e) {
  const output = (e.stdout || '').toString();
  const summary = output.split('\n').filter(l => 
    l.includes('Test Suites:') || l.includes('Tests:')
  );
  for (const s of summary) console.log('  ' + s.trim());
  
  const failSuites = output.split('\n').filter(l => l.trim().startsWith('FAIL'));
  if (failSuites.length > 0) {
    console.log('\n  Failed suites:');
    for (const s of failSuites) console.log('    ' + s.trim());
  }
}

console.log('\n' + '='.repeat(60));
console.log('  Done');
console.log('='.repeat(60));
