#!/usr/bin/env node
/**
 * DAY 22: Export de données (PDF/Excel)
 * 
 * Features:
 * - Export vaccinations (PDF + Excel)
 * - Export sessions (PDF + Excel) 
 * - Export absenteisme (PDF + Excel)
 * - Export stock (Excel)
 * - All admin-only with JWT auth
 * - Date range and centre filters
 * 
 * Files created:
 * - src/controllers/exportController.js
 * - src/routes/exportRoutes.js
 * - tests/export.test.js
 * 
 * Files modified:
 * - src/app.js (add /api/exports route)
 * 
 * Run: node day22-export.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

function writeFile(relPath, content) {
  const fullPath = PROJECT + '/' + relPath;
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('  [OK] ' + relPath + ' (' + content.length + ' bytes)');
}

function readFile(relPath) {
  try { return fs.readFileSync(PROJECT + '/' + relPath, 'utf8'); }
  catch(e) { return null; }
}

console.log('='.repeat(60));
console.log('  DAY 22: Export de donnees (PDF/Excel)');
console.log('='.repeat(60));

// ── STEP 1: Create exportController.js ─────────────────────────
console.log('\nSTEP 1: Creating exportController.js...');

writeFile('src/controllers/exportController.js', `'use strict';

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { pool } = require('../config/database');
const catchAsync = require('../utils/catchAsync');

function buildVaccinationQuery(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (filters.date_debut) {
    conditions.push('vac.date_heure >= $' + idx);
    params.push(filters.date_debut);
    idx++;
  }
  if (filters.date_fin) {
    conditions.push('vac.date_heure <= $' + idx);
    params.push(filters.date_fin);
    idx++;
  }
  if (filters.centre_id) {
    conditions.push('s.centre_id = $' + idx);
    params.push(parseInt(filters.centre_id));
    idx++;
  }
  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  return {
    query: 'SELECT vac.id, vac.date_heure, vac.poids, vac.taille, vac.reactions, ' +
      'b.prenom as bebe_prenom, b.nom as bebe_nom, b.date_naissance, ' +
      'v.nom as vaccin_nom, c.nom as centre_nom, ' +
      'p.nom as personnel_nom, p.prenom as personnel_prenom ' +
      'FROM vaccination vac ' +
      'JOIN rendez_vous rdv ON vac.rendez_vous_id = rdv.id ' +
      'JOIN bebe b ON rdv.bebe_id = b.id ' +
      'JOIN session s ON rdv.session_id = s.id ' +
      'JOIN vaccin v ON s.vaccin_id = v.id ' +
      'JOIN centre c ON s.centre_id = c.id ' +
      'LEFT JOIN personnel p ON vac.personnel_id = p.id ' +
      where + ' ORDER BY vac.date_heure DESC',
    params: params
  };
}

function buildSessionQuery(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (filters.date_debut) {
    conditions.push('s.date_session >= $' + idx);
    params.push(filters.date_debut);
    idx++;
  }
  if (filters.date_fin) {
    conditions.push('s.date_session <= $' + idx);
    params.push(filters.date_fin);
    idx++;
  }
  if (filters.centre_id) {
    conditions.push('s.centre_id = $' + idx);
    params.push(parseInt(filters.centre_id));
    idx++;
  }
  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  return {
    query: 'SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.statut, ' +
      's.max_inscriptions, v.nom as vaccin_nom, c.nom as centre_nom, ' +
      '(SELECT COUNT(*) FROM rendez_vous rdv WHERE rdv.session_id = s.id) as nb_inscriptions ' +
      'FROM session s ' +
      'JOIN vaccin v ON s.vaccin_id = v.id ' +
      'JOIN centre c ON s.centre_id = c.id ' +
      where + ' ORDER BY s.date_session DESC',
    params: params
  };
}

const exportVaccinationsPdf = catchAsync(async function(req, res) {
  const built = buildVaccinationQuery(req.query);
  const result = await pool.query(built.query, built.params);
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_vaccinations.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text('Rapport Vaccinations', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Date: ' + new Date().toLocaleDateString());
  doc.moveDown();
  result.rows.forEach(function(row) {
    doc.fontSize(10).text(
      row.bebe_prenom + ' ' + row.bebe_nom +
      ' | Vaccin: ' + row.vaccin_nom +
      ' | Date: ' + new Date(row.date_heure).toLocaleDateString() +
      ' | Centre: ' + row.centre_nom
    );
  });
  doc.end();
});

const exportVaccinationsExcel = catchAsync(async function(req, res) {
  const built = buildVaccinationQuery(req.query);
  const result = await pool.query(built.query, built.params);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Vaccinations');
  worksheet.columns = [
    { header: 'Bebe', key: 'bebe' },
    { header: 'Vaccin', key: 'vaccin' },
    { header: 'Date', key: 'date' },
    { header: 'Centre', key: 'centre' },
    { header: 'Poids (kg)', key: 'poids' },
    { header: 'Taille (cm)', key: 'taille' }
  ];
  result.rows.forEach(function(row) {
    worksheet.addRow({
      bebe: row.bebe_prenom + ' ' + row.bebe_nom,
      vaccin: row.vaccin_nom,
      date: new Date(row.date_heure).toLocaleDateString(),
      centre: row.centre_nom,
      poids: row.poids,
      taille: row.taille
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_vaccinations.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

const exportSessionsPdf = catchAsync(async function(req, res) {
  const built = buildSessionQuery(req.query);
  const result = await pool.query(built.query, built.params);
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_sessions.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text('Rapport Sessions', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Date: ' + new Date().toLocaleDateString());
  doc.moveDown();
  result.rows.forEach(function(row) {
    doc.fontSize(10).text(
      'Session: ' + row.vaccin_nom +
      ' | Date: ' + new Date(row.date_session).toLocaleDateString() +
      ' | Centre: ' + row.centre_nom +
      ' | Statut: ' + row.statut +
      ' | Inscriptions: ' + row.nb_inscriptions + '/' + row.max_inscriptions
    );
  });
  doc.end();
});

const exportSessionsExcel = catchAsync(async function(req, res) {
  const built = buildSessionQuery(req.query);
  const result = await pool.query(built.query, built.params);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sessions');
  worksheet.columns = [
    { header: 'Vaccin', key: 'vaccin' },
    { header: 'Date', key: 'date' },
    { header: 'Centre', key: 'centre' },
    { header: 'Statut', key: 'statut' },
    { header: 'Inscriptions', key: 'inscriptions' }
  ];
  result.rows.forEach(function(row) {
    worksheet.addRow({
      vaccin: row.vaccin_nom,
      date: new Date(row.date_session).toLocaleDateString(),
      centre: row.centre_nom,
      statut: row.statut,
      inscriptions: row.nb_inscriptions + '/' + row.max_inscriptions
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_sessions.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

const exportAbsenteismePdf = catchAsync(async function(req, res) {
  const result = await pool.query(
    'SELECT p.id, p.nom, p.prenom, p.telephone, p.nb_absences_consecutives ' +
    'FROM parent p WHERE p.nb_absences_consecutives > 0 ORDER BY p.nb_absences_consecutives DESC'
  );
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_absenteisme.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text('Rapport Absenteisme', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Date: ' + new Date().toLocaleDateString());
  doc.moveDown();
  result.rows.forEach(function(row) {
    doc.fontSize(10).text(
      row.prenom + ' ' + row.nom +
      ' | Tel: ' + row.telephone +
      ' | Absences consecutives: ' + row.nb_absences_consecutives
    );
  });
  doc.end();
});

const exportAbsenteismeExcel = catchAsync(async function(req, res) {
  const result = await pool.query(
    'SELECT p.id, p.nom, p.prenom, p.telephone, p.nb_absences_consecutives ' +
    'FROM parent p WHERE p.nb_absences_consecutives > 0 ORDER BY p.nb_absences_consecutives DESC'
  );
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Absenteisme');
  worksheet.columns = [
    { header: 'Nom', key: 'nom' },
    { header: 'Prenom', key: 'prenom' },
    { header: 'Telephone', key: 'telephone' },
    { header: 'Absences consecutives', key: 'absences' }
  ];
  result.rows.forEach(function(row) {
    worksheet.addRow({
      nom: row.nom,
      prenom: row.prenom,
      telephone: row.telephone,
      absences: row.nb_absences_consecutives
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_absenteisme.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

const exportStockExcel = catchAsync(async function(req, res) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (req.query.centre_id) {
    conditions.push('st.centre_id = $' + idx);
    params.push(parseInt(req.query.centre_id));
    idx++;
  }
  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  const result = await pool.query(
    'SELECT st.id, st.quantite_disponible, st.seuil_alerte, ' +
    'v.nom as vaccin_nom, c.nom as centre_nom ' +
    'FROM stock st ' +
    'JOIN vaccin v ON st.vaccin_id = v.id ' +
    'JOIN centre c ON st.centre_id = c.id ' +
    where + ' ORDER BY c.nom, v.nom',
    params
  );
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock');
  worksheet.columns = [
    { header: 'Centre', key: 'centre' },
    { header: 'Vaccin', key: 'vaccin' },
    { header: 'Quantite', key: 'quantite' },
    { header: 'Seuil alerte', key: 'seuil' }
  ];
  result.rows.forEach(function(row) {
    worksheet.addRow({
      centre: row.centre_nom,
      vaccin: row.vaccin_nom,
      quantite: row.quantite_disponible,
      seuil: row.seuil_alerte
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_stock.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = {
  exportVaccinationsPdf,
  exportVaccinationsExcel,
  exportSessionsPdf,
  exportSessionsExcel,
  exportAbsenteismePdf,
  exportAbsenteismeExcel,
  exportStockExcel
};
`);

// ── STEP 2: Create exportRoutes.js ─────────────────────────────
console.log('\nSTEP 2: Creating exportRoutes.js...');

writeFile('src/routes/exportRoutes.js', `'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const exportController = require('../controllers/exportController');

router.use(authenticate);

router.get('/vaccinations/pdf', authorize('admin'), exportController.exportVaccinationsPdf);
router.get('/vaccinations/excel', authorize('admin'), exportController.exportVaccinationsExcel);
router.get('/sessions/pdf', authorize('admin'), exportController.exportSessionsPdf);
router.get('/sessions/excel', authorize('admin'), exportController.exportSessionsExcel);
router.get('/absenteisme/pdf', authorize('admin'), exportController.exportAbsenteismePdf);
router.get('/absenteisme/excel', authorize('admin'), exportController.exportAbsenteismeExcel);
router.get('/stock/excel', authorize('admin'), exportController.exportStockExcel);

module.exports = router;
`);

// ── STEP 3: Add route to app.js ────────────────────────────────
console.log('\nSTEP 3: Adding /api/exports route to app.js...');

let appCode = readFile('src/app.js');

if (appCode.includes('/api/exports')) {
  console.log('  [OK] /api/exports route already exists in app.js');
} else {
  // Insert before the file-attente route (which is before the 404 handler)
  const fileAttenteLine = "app.use('/api/file-attente', require('./routes/fileAttenteRoutes'));";
  if (appCode.includes(fileAttenteLine)) {
    appCode = appCode.replace(
      fileAttenteLine,
      "app.use('/api/exports', require('./routes/exportRoutes'));\n" + fileAttenteLine
    );
    console.log('  [OK] Added /api/exports route before file-attente');
  } else {
    // Fallback: insert before 404 handler
    const catchAll = "app.use((req, res) => {";
    if (appCode.includes(catchAll)) {
      appCode = appCode.replace(
        catchAll,
        "app.use('/api/exports', require('./routes/exportRoutes'));\n\n" + catchAll
      );
      console.log('  [OK] Added /api/exports route before 404 handler');
    }
  }
  fs.writeFileSync(PROJECT + '/src/app.js', appCode);
}

// ── STEP 4: Create export.test.js ──────────────────────────────
console.log('\nSTEP 4: Creating export.test.js...');

writeFile('tests/export.test.js', `const request = require('supertest');
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

let app;
let adminToken;
let nurseToken;
let parentToken;

beforeAll(async () => {
  delete require.cache[require.resolve('../src/app')];
  app = require('../src/app');

  // Create test admin
  const adminHash = await bcrypt.hash('ExportAdmin123!', 10);
  await pool.query(
    \`INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('EXPORTADMIN01', 'ExportAdmin', 'Test', $1, 'admin', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1\`,
    [adminHash]
  );

  // Create test nurse
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

  // Register a parent via OTP bypass
  const parentPhone = '+212699002200';
  await request(app)
    .post('/api/auth/parent/send-otp')
    .send({ telephone: parentPhone });

  const verifyRes = await request(app)
    .post('/api/auth/parent/verify-otp')
    .send({ telephone: parentPhone, code: '123456', nom: 'ExportParent', prenom: 'Test' });
  parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;
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
`);

// ── STEP 5: Run export tests in isolation ──────────────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 5: Running export tests in isolation');
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
    console.log('  ✅ Export tests PASSED!');
  } else {
    console.log('  ⚠️  Some export tests failed');
    const failLines = result.split('\n').filter(l => l.includes('✕'));
    for (const f of failLines) console.log('    ' + f.trim());
  }
} catch (e) {
  const output = (e.stdout || '').toString();
  const passMatch = output.match(/Tests:\s+(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '?') + ' failed');
  
  // Show errors
  let inError = false;
  let errorBuf = [];
  for (const line of output.split('\n')) {
    if (line.trim().startsWith('●')) { inError = true; errorBuf = []; }
    if (inError) {
      errorBuf.push(line);
      if (line.trim() === '' && errorBuf.length > 3) {
        console.log(errorBuf.join('\n'));
        inError = false;
      }
    }
  }
}

// ── STEP 6: Run FULL test suite ────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 6: Running FULL test suite');
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
console.log('  Day 22 installation complete');
console.log('='.repeat(60));
