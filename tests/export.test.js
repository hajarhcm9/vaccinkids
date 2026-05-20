const request = require('supertest');
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
    `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('EXPADM01', 'ExpAdmin', 'Test', $1, 'admin', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1`,
    [adminHash]
  );

  // Create test nurse
  const nurseHash = await bcrypt.hash('ExpNrs123!', 10);
  await pool.query(
    `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('EXPNRS01', 'ExpNurse', 'Test', $1, 'infirmier', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1`,
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
