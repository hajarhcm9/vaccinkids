#!/usr/bin/env node
/**
 * FIX: export.test.js - tokens undefined in beforeAll
 * 
 * Problem: All 10 export tests fail with "expect(received).toBe(expected)"
 * This means adminToken/nurseToken/parentToken are undefined
 * 
 * Root cause: Same issue as statsDashboard.test.js - need to use
 * the '123456' OTP bypass and ensure beforeAll gets enough time.
 * 
 * Also: The export controller uses require('../config/database') with
 * destructured { pool } - must match the project's import style.
 * 
 * Run: node fix-export-test.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('='.repeat(60));
console.log('  FIX: export.test.js tokens + controller verification');
console.log('='.repeat(60));

// ── STEP 1: Check what database import style is used ───────────
console.log('\nSTEP 1: Checking database import style...');

const dbPath = `${PROJECT}/src/config/database.js`;
if (fs.existsSync(dbPath)) {
  const dbCode = fs.readFileSync(dbPath, 'utf8');
  const hasPoolExport = dbCode.includes('module.exports.pool') || dbCode.includes('exports.pool');
  const hasQueryExport = dbCode.includes('module.exports.query') || dbCode.includes('exports.query');
  const hasDefaultExport = dbCode.includes('module.exports =') && !dbCode.includes('module.exports = {');
  
  console.log('  Has pool export: ' + hasPoolExport);
  console.log('  Has query export: ' + hasQueryExport);
  console.log('  Has default export: ' + hasDefaultExport);
  
  // Check how other controllers import the pool
  const vacCtrl = fs.readFileSync(`${PROJECT}/src/controllers/vaccinationController.js`, 'utf8');
  const vacImport = vacCtrl.match(/require\(['"]\.\.\/config\/database['"]\)[^\n]*/)?.[0];
  console.log('  vaccinationController import: ' + vacImport);
  
  const statsCtrl = fs.readFileSync(`${PROJECT}/src/controllers/statsController.js`, 'utf8');
  const statsImport = statsCtrl.match(/require\(['"]\.\.\/config\/database['"]\)[^\n]*/)?.[0];
  console.log('  statsController import: ' + statsImport);
  
  // Check what the DB module actually exports
  const exportLines = dbCode.split('\n').filter(l => l.includes('module.exports') || l.includes('exports.'));
  console.log('  Export lines:');
  for (const l of exportLines) console.log('    ' + l.trim());
}

// ── STEP 2: Check how existing working services use pool ───────
console.log('\nSTEP 2: Checking existing service import patterns...');

const services = ['fileAttenteService.js', 'statsService.js'];
for (const svc of services) {
  const svcPath = `${PROJECT}/src/services/${svc}`;
  if (fs.existsSync(svcPath)) {
    const svcCode = fs.readFileSync(svcPath, 'utf8');
    const importLine = svcCode.match(/require\(['"]\.\.\/config\/database['"]\)[^\n]*/)?.[0];
    console.log('  ' + svc + ': ' + importLine);
  }
}

// ── STEP 3: Read the exportController.js we just created ───────
console.log('\nSTEP 3: Checking exportController.js...');

const exportCtrlPath = `${PROJECT}/src/controllers/exportController.js`;
const exportCtrlCode = fs.readFileSync(exportCtrlPath, 'utf8');
const exportImport = exportCtrlCode.match(/require\(['"]\.\.\/config\/database['"]\)[^\n]*/)?.[0];
console.log('  exportController import: ' + exportImport);

// If the import style is wrong, fix it
// Check if using { pool } = require but the module exports query
if (exportImport && exportImport.includes('{ pool }')) {
  // Verify the database module actually exports pool
  const dbCode = fs.readFileSync(dbPath, 'utf8');
  if (!dbCode.includes('module.exports.pool') && !dbCode.includes('exports.pool') && dbCode.includes('module.exports.query')) {
    console.log('  ⚠️  FIX NEEDED: exportController uses { pool } but database exports query');
    // Replace { pool } with { query } or the correct import
  }
}

// ── STEP 4: Read current export.test.js ────────────────────────
console.log('\nSTEP 4: Reading current export.test.js...');

const testPath = `${PROJECT}/tests/export.test.js`;
let testCode = fs.readFileSync(testPath, 'utf8');

// Check if it uses getOTP or '123456' bypass
console.log('  Uses 123456 bypass: ' + testCode.includes("code: '123456'"));
console.log('  Uses getOTP: ' + testCode.includes('getOTP'));

// The test likely has tokens undefined. Let's add more debugging and
// increase timeout, and verify the login works

// Let's check what the test expects for the login response
const loginPart = testCode.match(/adminLogin\.body[^;]+/)?.[0];
console.log('  Admin token extraction: ' + loginPart);

// ── STEP 5: Fix the export.test.js ─────────────────────────────
console.log('\nSTEP 5: Fixing export.test.js...');

// Replace the entire test file with a more robust version
testCode = `const request = require('supertest');
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

let app;
let adminToken;
let nurseToken;
let parentToken;
let adminId;

beforeAll(async () => {
  delete require.cache[require.resolve('../src/app')];
  app = require('../src/app');

  // Create test admin directly in DB
  const adminHash = await bcrypt.hash('ExportAdmin123!', 10);
  const adminRes = await pool.query(
    \`INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('EXPORTADMIN01', 'ExportAdmin', 'Test', $1, 'admin', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1
     RETURNING id\`,
    [adminHash]
  );
  adminId = adminRes.rows[0].id;

  // Create test nurse directly in DB
  const nurseHash = await bcrypt.hash('ExportNurse123!', 10);
  await pool.query(
    \`INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('EXPORTNURSE01', 'ExportNurse', 'Test', $1, 'infirmier', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1\`,
    [nurseHash]
  );

  // Login as admin
  const adminLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'EXPORTADMIN01', mot_de_passe: 'ExportAdmin123!' });
  adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.accessToken;

  // Login as nurse
  const nurseLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'EXPORTNURSE01', mot_de_passe: 'ExportNurse123!' });
  nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.accessToken;

  // Register a parent via OTP bypass '123456'
  const parentPhone = '+212699002200';
  await request(app)
    .post('/api/auth/parent/send-otp')
    .send({ telephone: parentPhone });

  const verifyRes = await request(app)
    .post('/api/auth/parent/verify-otp')
    .send({ telephone: parentPhone, code: '123456', nom: 'ExportParent', prenom: 'Test' });
  parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;

  // Validate tokens
  if (!adminToken) console.error('EXPORT TEST: adminToken is undefined! Login response:', JSON.stringify(adminLogin.body).substring(0, 200));
  if (!nurseToken) console.error('EXPORT TEST: nurseToken is undefined! Login response:', JSON.stringify(nurseLogin.body).substring(0, 200));
  if (!parentToken) console.error('EXPORT TEST: parentToken is undefined! Verify response:', JSON.stringify(verifyRes.body).substring(0, 200));
}, 30000);

afterAll(async () => {
  try {
    await pool.query("DELETE FROM personnel WHERE cin IN ('EXPORTADMIN01', 'EXPORTNURSE01')");
  } catch (e) {}
  await pool.end();
}, 15000);

describe('Day 22 - Export de donnees', () => {
  // ==========================================
  // Vaccinations Export
  // ==========================================
  describe('GET /api/exports/vaccinations/pdf', () => {
    test('should export vaccinations as PDF for admin', async () => {
      const res = await request(app)
        .get('/api/exports/vaccinations/pdf')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    test('should deny nurse from exporting vaccinations PDF', async () => {
      const res = await request(app)
        .get('/api/exports/vaccinations/pdf')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(403);
    });

    test('should deny unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/exports/vaccinations/pdf');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/exports/vaccinations/excel', () => {
    test('should export vaccinations as Excel for admin', async () => {
      const res = await request(app)
        .get('/api/exports/vaccinations/excel')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });

    test('should support date filters', async () => {
      const res = await request(app)
        .get('/api/exports/vaccinations/excel?date_debut=2020-01-01&date_fin=2030-12-31')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // Sessions Export
  // ==========================================
  describe('GET /api/exports/sessions/pdf', () => {
    test('should export sessions as PDF for admin', async () => {
      const res = await request(app)
        .get('/api/exports/sessions/pdf')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('GET /api/exports/sessions/excel', () => {
    test('should export sessions as Excel for admin', async () => {
      const res = await request(app)
        .get('/api/exports/sessions/excel')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });

  // ==========================================
  // Absenteisme Export
  // ==========================================
  describe('GET /api/exports/absenteisme/pdf', () => {
    test('should export absenteisme as PDF for admin', async () => {
      const res = await request(app)
        .get('/api/exports/absenteisme/pdf')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('GET /api/exports/absenteisme/excel', () => {
    test('should export absenteisme as Excel for admin', async () => {
      const res = await request(app)
        .get('/api/exports/absenteisme/excel')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });
  });

  // ==========================================
  // Stock Export
  // ==========================================
  describe('GET /api/exports/stock/excel', () => {
    test('should export stock as Excel for admin', async () => {
      const res = await request(app)
        .get('/api/exports/stock/excel')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });

    test('should filter stock by centre_id', async () => {
      const res = await request(app)
        .get('/api/exports/stock/excel?centre_id=1')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
    });

    test('should deny parent access', async () => {
      const res = await request(app)
        .get('/api/exports/stock/excel')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });
  });
});
`;

fs.writeFileSync(testPath, testCode);
console.log('  [OK] Rewrote export.test.js with debugging');

// ── STEP 6: Also check/fix exportController.js import ──────────
console.log('\nSTEP 6: Checking exportController.js import...');

// Read the database module to understand exports
const dbCode = fs.readFileSync(`${PROJECT}/src/config/database.js`, 'utf8');

// Check what the database module exports
if (dbCode.includes('module.exports = { pool }') || dbCode.includes('module.exports.pool')) {
  console.log('  Database exports pool - import is correct');
} else if (dbCode.includes('module.exports = { query }') || dbCode.includes('module.exports.query')) {
  console.log('  ⚠️  Database exports query, not pool!');
  // Fix the controller to use query instead of pool
  let ctrlCode = fs.readFileSync(exportCtrlPath, 'utf8');
  ctrlCode = ctrlCode.replace(
    "const { pool } = require('../config/database');",
    "const { query } = require('../config/database');"
  );
  // Also replace pool.query with query
  ctrlCode = ctrlCode.replace(/pool\.query/g, 'query');
  fs.writeFileSync(exportCtrlPath, ctrlCode);
  console.log('  [OK] Fixed exportController.js to use query() instead of pool.query()');
} else {
  // Check if it exports both or uses a different pattern
  const exportLine = dbCode.match(/module\.exports\s*=\s*\{[^}]+\}/)?.[0];
  console.log('  Database exports: ' + (exportLine || 'unknown pattern'));
  
  // Check other working files
  const fileAttenteSvc = fs.readFileSync(`${PROJECT}/src/services/fileAttenteService.js`, 'utf8');
  const faImport = fileAttenteSvc.match(/require\(['"]\.\.\/config\/database['"]\)[^\n]*/)?.[0];
  console.log('  fileAttenteService uses: ' + faImport);
  
  // Use the same pattern as working services
  if (faImport) {
    let ctrlCode = fs.readFileSync(exportCtrlPath, 'utf8');
    const oldImport = ctrlCode.match(/require\(['"]\.\.\/config\/database['"]\)[^\n]*/)?.[0];
    if (oldImport && oldImport !== faImport) {
      // Replace the import
      ctrlCode = ctrlCode.replace(oldImport, faImport);
      
      // If fileAttenteService uses { query }, replace pool.query with query
      if (faImport.includes('query') && !faImport.includes('pool')) {
        ctrlCode = ctrlCode.replace(/pool\.query/g, 'query');
      }
      
      fs.writeFileSync(exportCtrlPath, ctrlCode);
      console.log('  [OK] Updated exportController.js import to match: ' + faImport);
    }
  }
}

// ── STEP 7: Run export tests in isolation ──────────────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 7: Running export tests in isolation');
console.log('='.repeat(60));

try {
  const result = execSync(
    'npx jest tests/export.test.js --verbose --forceExit 2>&1',
    { cwd: PROJECT, timeout: 120000, maxBuffer: 5*1024*1024, encoding: 'utf8' }
  );
  
  const passMatch = result.match(/Tests:\s+(\d+) passed/);
  const failMatch = result.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '0') + ' failed');
  
  // Show token warnings
  if (result.includes('EXPORT TEST:')) {
    console.log('\n  Token warnings:');
    const warnLines = result.split('\n').filter(l => l.includes('EXPORT TEST:'));
    for (const w of warnLines) console.log('    ' + w.trim());
  }
  
  // Show errors
  let inError = false;
  let errorBuf = [];
  for (const line of result.split('\n')) {
    if (line.trim().startsWith('●')) { inError = true; errorBuf = []; }
    if (inError) {
      errorBuf.push(line);
      if (line.trim() === '' && errorBuf.length > 3) {
        console.log(errorBuf.join('\n'));
        inError = false;
      }
    }
  }
} catch (e) {
  const output = (e.stdout || '').toString();
  const passMatch = output.match(/Tests:\s+(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '?') + ' failed');
  
  // Show token warnings
  if (output.includes('EXPORT TEST:')) {
    console.log('\n  Token warnings:');
    const warnLines = output.split('\n').filter(l => l.includes('EXPORT TEST:'));
    for (const w of warnLines.slice(0, 3)) console.log('    ' + w.trim().substring(0, 200));
  }
  
  // Show first few errors
  let inError = false;
  let errorBuf = [];
  let errorCount = 0;
  for (const line of output.split('\n')) {
    if (line.trim().startsWith('●')) { inError = true; errorBuf = []; errorCount++; }
    if (inError) {
      errorBuf.push(line);
      if (line.trim() === '' && errorBuf.length > 3) {
        if (errorCount <= 2) console.log(errorBuf.join('\n'));
        inError = false;
      }
    }
  }
}

// ── STEP 8: Run FULL test suite ────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 8: Running FULL test suite');
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
  
  if (result.includes('0 failed')) {
    console.log('\n  ✅ ALL TESTS PASSED!');
  } else {
    const failSuites = result.split('\n').filter(l => l.trim().startsWith('FAIL'));
    console.log('\n  Failed suites:');
    for (const s of failSuites) console.log('    ' + s.trim());
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
