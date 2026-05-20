#!/usr/bin/env node
/**
 * DEFINITIVE FIX: Rewrite export.test.js with correct CIN format
 * 
 * Root cause: CIN validation regex is /^[A-Za-z0-9]{4,12}$/
 * - 'EXPORTADMIN01' = 13 chars → REJECTED
 * - 'STATSADMIN01' = 12 chars → OK (statsDashboard uses this)
 * - 'ADMIN01' = 7 chars → OK (most tests use this)
 * 
 * Also: the previous fix-export-cin.js corrupted passwords by doing
 * ExportAdmin → ExportAdm which changed the password string too!
 * 
 * Fix: Rewrite the test from scratch with valid 4-12 char CINs
 * 
 * Run: node fix-export-definitive.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('='.repeat(60));
console.log('  DEFINITIVE FIX: Rewrite export.test.js');
console.log('='.repeat(60));

// ── STEP 1: Rewrite export.test.js from scratch ────────────────
console.log('\nSTEP 1: Rewriting export.test.js with correct CINs...');

const testCode = `const request = require('supertest');
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

let app;
let adminToken;
let nurseToken;
let parentToken;

beforeAll(async () => {
  delete require.cache[require.resolve('../src/app')];
  app = require('../src/app');

  // Create test admin - CIN must be 4-12 alphanumeric chars
  const adminHash = await bcrypt.hash('ExpAdm123!', 10);
  await pool.query(
    \`INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('EXPADM01', 'ExpAdmin', 'Test', $1, 'admin', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1\`,
    [adminHash]
  );

  // Create test nurse
  const nurseHash = await bcrypt.hash('ExpNrs123!', 10);
  await pool.query(
    \`INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('EXPNRS01', 'ExpNurse', 'Test', $1, 'infirmier', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1\`,
    [nurseHash]
  );

  // Login as admin
  const adminLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'EXPADM01', mot_de_passe: 'ExpAdm123!' });
  adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.accessToken;

  // Login as nurse
  const nurseLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'EXPNRS01', mot_de_passe: 'ExpNrs123!' });
  nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.accessToken;

  // Register parent via OTP bypass
  const parentPhone = '+212699002200';
  await request(app)
    .post('/api/auth/parent/send-otp')
    .send({ telephone: parentPhone });

  const verifyRes = await request(app)
    .post('/api/auth/parent/verify-otp')
    .send({ telephone: parentPhone, code: '123456', nom: 'ExpParent', prenom: 'Test' });
  parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;

  if (!adminToken) console.error('EXPORT: adminToken undefined!', JSON.stringify(adminLogin.body).substring(0, 200));
  if (!nurseToken) console.error('EXPORT: nurseToken undefined!', JSON.stringify(nurseLogin.body).substring(0, 200));
  if (!parentToken) console.error('EXPORT: parentToken undefined!', JSON.stringify(verifyRes.body).substring(0, 200));
}, 30000);

afterAll(async () => {
  try {
    await pool.query("DELETE FROM personnel WHERE cin IN ('EXPADM01', 'EXPNRS01')");
  } catch (e) {}
  await pool.end();
}, 15000);

describe('Day 22 - Export de donnees', () => {
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

fs.writeFileSync(`${PROJECT}/tests/export.test.js`, testCode);
console.log('  [OK] Rewrote export.test.js');
console.log('  CINs: EXPADM01 (8 chars), EXPNRS01 (8 chars) - both pass regex');

// ── STEP 2: Verify exportController.js import is correct ───────
console.log('\nSTEP 2: Verifying exportController.js...');

const ctrlPath = `${PROJECT}/src/controllers/exportController.js`;
let ctrlCode = fs.readFileSync(ctrlPath, 'utf8');

// The database exports: { pool, query, getClient, describeDbError }
// fileAttenteService uses: require('../config/database').pool
// Make sure exportController uses the same pattern
if (ctrlCode.includes("require('../config/database').pool")) {
  console.log('  [OK] Import uses .pool pattern');
  
  // Also make sure pool.query is used, not just query()
  const poolQueryCount = (ctrlCode.match(/pool\.query/g) || []).length;
  console.log('  pool.query calls: ' + poolQueryCount);
} else if (ctrlCode.includes("const { pool } = require('../config/database')")) {
  console.log('  [OK] Import uses destructured { pool }');
  const poolQueryCount = (ctrlCode.match(/pool\.query/g) || []).length;
  console.log('  pool.query calls: ' + poolQueryCount);
} else {
  console.log('  ⚠️  Unexpected import pattern, fixing...');
  const oldImport = ctrlCode.match(/require\(['"]\.\.\/config\/database['"]\)[^\n;]*/)?.[0];
  if (oldImport) {
    ctrlCode = ctrlCode.replace(oldImport, "require('../config/database').pool");
    // Replace pool.query with just pool usage if needed
    // Actually with .pool we get pool directly, so pool.query is correct
    fs.writeFileSync(ctrlPath, ctrlCode);
    console.log('  [OK] Fixed import');
  }
}

// ── STEP 3: Run export tests in isolation ──────────────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 3: Running export tests in isolation');
console.log('='.repeat(60));

try {
  const result = execSync(
    'npx jest tests/export.test.js --verbose --forceExit 2>&1',
    { cwd: PROJECT, timeout: 120000, maxBuffer: 5*1024*1024, encoding: 'utf8' }
  );
  
  const passMatch = result.match(/Tests:\s+(\d+) passed/);
  const failMatch = result.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '0') + ' failed');
  
  if (result.includes('EXPORT:')) {
    const warnLines = result.split('\n').filter(l => l.includes('EXPORT:'));
    for (const w of warnLines.slice(0, 3)) console.log('    ' + w.trim().substring(0, 200));
  }
  
  if (!failMatch || failMatch[1] === '0') {
    console.log('\n  ✅ Export tests PASSED!');
  } else {
    const failLines = result.split('\n').filter(l => l.includes('✕'));
    console.log('\n  Failed tests:');
    for (const f of failLines) console.log('    ' + f.trim());
    
    // Show error details
    let inError = false;
    let errorBuf = [];
    let cnt = 0;
    for (const line of result.split('\n')) {
      if (line.trim().startsWith('●')) { inError = true; errorBuf = []; cnt++; }
      if (inError) {
        errorBuf.push(line);
        if (line.trim() === '' && errorBuf.length > 3) {
          if (cnt <= 3) console.log(errorBuf.join('\n'));
          inError = false;
        }
      }
    }
  }
} catch (e) {
  const output = (e.stdout || '').toString();
  const passMatch = output.match(/Tests:\s+(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '?') + ' failed');
  
  if (output.includes('EXPORT:')) {
    const warnLines = output.split('\n').filter(l => l.includes('EXPORT:'));
    for (const w of warnLines.slice(0, 3)) console.log('    ' + w.trim().substring(0, 200));
  }
  
  // Show first few errors
  let inError = false;
  let errorBuf = [];
  let cnt = 0;
  for (const line of output.split('\n')) {
    if (line.trim().startsWith('●')) { inError = true; errorBuf = []; cnt++; }
    if (inError) {
      errorBuf.push(line);
      if (line.trim() === '' && errorBuf.length > 3) {
        if (cnt <= 3) console.log(errorBuf.join('\n'));
        inError = false;
      }
    }
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
