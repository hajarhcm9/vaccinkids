'use strict';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

jest.setTimeout(60000);

describe('Day 25 - Exports PDF/Excel', function() {
  let adminToken;
  let nurseToken;
  let parentToken;

  const adminCIN = 'EXPADM01';
  const nurseCIN = 'EXPNRS01';

  beforeAll(async function() {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('ExpAdmin12!', 10);

    await pool.query('DELETE FROM sync_queue');
    await pool.query('DELETE FROM personnel WHERE cin IN ($1, $2)', [adminCIN, nurseCIN]);

    const centreResult = await pool.query('SELECT id FROM centre LIMIT 1');
    const centreId = centreResult.rows[0]?.id || 1;

    await pool.query(
      'INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif, failed_login_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)',
      [adminCIN, 'ExpAdmin', 'Test', hashedPassword, 'admin', centreId, true]
    );

    const nursePassword = await bcrypt.hash('ExpNurse12!', 10);
    await pool.query(
      'INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif, failed_login_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)',
      [nurseCIN, 'ExpNurse', 'Test', nursePassword, 'infirmier', centreId, true]
    );

    const adminLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: adminCIN, mot_de_passe: 'ExpAdmin12!' });
    adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.accessToken;

    const nurseLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: nurseCIN, mot_de_passe: 'ExpNurse12!' });
    nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.accessToken;

    // Get parent token via OTP
    const parentPhone = '+212600000088';
    await request(app)
      .post('/api/auth/parent/send-otp')
      .send({ telephone: parentPhone });
    const verifyRes = await request(app)
      .post('/api/auth/parent/verify-otp')
      .send({ telephone: parentPhone, code: '123456' });
    parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;
  });

  afterAll(async function() {
    await pool.query('DELETE FROM sync_queue');
    await pool.query('DELETE FROM personnel WHERE cin IN ($1, $2)', [adminCIN, nurseCIN]);
    await pool.end();
  });

  // ==================
  // PDF Export
  // ==================
  describe('GET /api/exports/pdf - PDF Export', function() {
    it('should require authentication', async function() {
      const res = await request(app).get('/api/exports/pdf');
      expect(res.status).toBe(401);
    });

    it('should require admin role - infirmier forbidden', async function() {
      const res = await request(app)
        .get('/api/exports/pdf?month=5&year=2026')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(403);
    });

    it('should require admin role - parent forbidden', async function() {
      if (!parentToken) return;
      const res = await request(app)
        .get('/api/exports/pdf?month=5&year=2026')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(403);
    });

    it('should reject invalid month', async function() {
      const res = await request(app)
        .get('/api/exports/pdf?month=13&year=2026')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(400);
    });

    it('should reject invalid year', async function() {
      const res = await request(app)
        .get('/api/exports/pdf?month=5&year=2019')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(400);
    });

    it('should generate PDF report for admin', async function() {
      const res = await request(app)
        .get('/api/exports/pdf?month=5&year=2026')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('pdf');
      expect(res.headers['content-disposition']).toContain('rapport-vaccination');
      expect(parseInt(res.headers["content-length"])).toBeGreaterThan(0);
    });

    it('should generate PDF with default month and year', async function() {
      const res = await request(app)
        .get('/api/exports/pdf')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('pdf');
    });

    it('should generate PDF with centre_id filter', async function() {
      const res = await request(app)
        .get('/api/exports/pdf?centre_id=1&month=5&year=2026')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('pdf');
    });
  });

  // ==================
  // Excel Export
  // ==================
  describe('GET /api/exports/excel - Excel Export', function() {
    it('should require authentication', async function() {
      const res = await request(app).get('/api/exports/excel');
      expect(res.status).toBe(401);
    });

    it('should require admin role - infirmier forbidden', async function() {
      const res = await request(app)
        .get('/api/exports/excel')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(403);
    });

    it('should require admin role - parent forbidden', async function() {
      if (!parentToken) return;
      const res = await request(app)
        .get('/api/exports/excel')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(403);
    });

    it('should generate Excel export for admin', async function() {
      const res = await request(app)
        .get('/api/exports/excel')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('export-vaccination');
      expect(parseInt(res.headers["content-length"])).toBeGreaterThan(0);
    });

    it('should generate Excel with date filters', async function() {
      const res = await request(app)
        .get('/api/exports/excel?start_date=2026-01-01&end_date=2026-12-31')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    });

    it('should generate Excel with centre_id filter', async function() {
      const res = await request(app)
        .get('/api/exports/excel?centre_id=1')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
    });
  });

  // ==================
  // Export Service Direct Tests
  // ==================
  describe('Export Service', function() {
    it('should generate valid PDF buffer', async function() {
      const exportService = require('../src/services/exportService');
      var buffer = await exportService.generateMonthlyPDF(1, 5, 2026);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
    });

    it('should generate valid Excel buffer', async function() {
      const exportService = require('../src/services/exportService');
      var buffer = await exportService.generateExcelExport(1, '2026-01-01', '2026-12-31');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.slice(0, 2).toString()).toBe('PK');
    });

    it('should generate PDF without centre_id', async function() {
      const exportService = require('../src/services/exportService');
      var buffer = await exportService.generateMonthlyPDF(null, 5, 2026);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate Excel without filters', async function() {
      const exportService = require('../src/services/exportService');
      var buffer = await exportService.generateExcelExport(null, null, null);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
