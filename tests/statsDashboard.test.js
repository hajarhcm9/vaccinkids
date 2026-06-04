jest.setTimeout(120000);

const request = require('supertest');
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

let app;
let adminToken;
let nurseToken;
let parentToken;
let adminId;
let nurseId;
let parentId;
let testBebeId;
let testSessionId;
let testRdvId;

beforeAll(async () => {
  // Clear require cache
  delete require.cache[require.resolve('../src/app')];
  app = require('../src/app');

  // Create test admin directly in DB
  const adminHash = await bcrypt.hash('AdminPass123!', 10);
  const adminRes = await pool.query(
    `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('STATSADMIN01', 'StatsAdmin', 'Test', $1, 'admin', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1
     RETURNING id`,
    [adminHash]
  );
  adminId = adminRes.rows[0].id;

  // Create test nurse directly in DB
  const nurseHash = await bcrypt.hash('NursePass123!', 10);
  const nurseRes = await pool.query(
    `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('STATSNURSE01', 'StatsNurse', 'Test', $1, 'infirmier', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1
     RETURNING id`,
    [nurseHash]
  );
  nurseId = nurseRes.rows[0].id;

  // Login as admin
  const adminLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'STATSADMIN01', mot_de_passe: 'AdminPass123!' });
  adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.accessToken;

  // Login as nurse
  const nurseLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'STATSNURSE01', mot_de_passe: 'NursePass123!' });
  nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.accessToken;

  // Register a parent via OTP
  const parentPhone = '+212699001100';
  await request(app)
    .post('/api/auth/parent/send-otp')
    .send({ telephone: parentPhone });

  // Use test bypass '123456' instead of fetching real OTP (more reliable)
  const verifyRes = await request(app)
    .post('/api/auth/parent/verify-otp')
    .send({ telephone: parentPhone, code: '123456', nom: 'StatsParent', prenom: 'Test' });
  parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;
  parentId = verifyRes.body.data?.parent?.id;

  // Create a test bebe
  if (parentId) {
    const bebeRes = await request(app)
      .post('/api/carnet/bebe')
      .set('Authorization', 'Bearer ' + parentToken)
      .send({
        prenom: 'StatsBebe',
        nom: 'Test',
        date_naissance: '2025-06-15',
        sexe: 'M',
      });
    testBebeId = bebeRes.body.data?.bebe?.id || bebeRes.body.data?.id;
  }

  // Create a test session
  const sessionRes = await request(app)
    .post('/api/sessions')
    .set('Authorization', 'Bearer ' + adminToken)
    .send({
      centre_id: 1,
      vaccin_id: 1,
      date_session: '2026-06-01',
      heure_debut: '09:00',
      heure_fin: '12:00',
      max_inscriptions: 20,
    });
  testSessionId = sessionRes.body.data?.session?.id || sessionRes.body.data?.id;

  // Create a test RDV
  if (testSessionId && parentId && testBebeId) {
    const rdvRes = await request(app)
      .post('/api/rendez-vous')
      .set('Authorization', 'Bearer ' + parentToken)
      .send({
        session_id: testSessionId,
        bebe_id: testBebeId,
      });
    testRdvId = rdvRes.body.data?.rendez_vous?.id || rdvRes.body.data?.id;
  }
  // Validate tokens were obtained
  if (!adminToken) console.error('STATS TEST: adminToken is undefined!');
  if (!nurseToken) console.error('STATS TEST: nurseToken is undefined!');
  if (!parentToken) console.error('STATS TEST: parentToken is undefined!');
}, 60000);

afterAll(async () => {
  // Cleanup test data
  try {
    if (testRdvId) await pool.query('DELETE FROM rendez_vous WHERE id = $1', [testRdvId]);
    if (testBebeId) await pool.query('DELETE FROM bebe WHERE id = $1', [testBebeId]);
    if (testSessionId) await pool.query('DELETE FROM session WHERE id = $1', [testSessionId]);
    await pool.query("DELETE FROM personnel WHERE cin IN ('STATSADMIN01', 'STATSNURSE01')");
    if (parentId) await pool.query('DELETE FROM parent WHERE id = $1', [parentId]);
  } catch (e) {
    // ignore cleanup errors
  }
  await pool.end();
}, 15000);

describe('Day 19 - Statistics & Dashboard', () => {
  // ==========================================
  // Dashboard KPIs
  // ==========================================
  describe('GET /api/stats/dashboard', () => {
    test('should return dashboard KPIs for admin', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.kpis).toHaveProperty('totalBebes');
      expect(res.body.data.kpis).toHaveProperty('totalParents');
      expect(res.body.data.kpis).toHaveProperty('totalCentres');
      expect(res.body.data.kpis).toHaveProperty('totalVaccinations');
      expect(res.body.data.kpis).toHaveProperty('tauxAbsenteisme');
      expect(res.body.data.kpis).toHaveProperty('sessionsAvenir7Jours');
      expect(res.body.data.kpis).toHaveProperty('alertesStockBas');
      expect(res.body.data.kpis).toHaveProperty('absentsHabituels');
      expect(res.body.data.kpis).toHaveProperty('retardsVaccinaux');
    });

    test('should return dashboard KPIs for nurse', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
      expect(res.body.data.kpis).toBeDefined();
    });

    test('should filter dashboard by centreId', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard?centreId=1')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.centreId).toBe(1);
    });

    test('should deny parent from viewing dashboard', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });

    test('should deny unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/stats/dashboard');

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // Vaccination Coverage
  // ==========================================
  describe('GET /api/stats/couverture-vaccinale', () => {
    jest.setTimeout(120000);
    test("should return vaccination coverage for admin", async () => {
      const res = await request(app)
        .get('/api/stats/couverture-vaccinale')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('tauxCouvertureGlobal');
      expect(res.body.data).toHaveProperty('bebesVaccines');
      expect(res.body.data).toHaveProperty('totalBebes');
      expect(res.body.data).toHaveProperty('parVaccin');
      expect(res.body.data).toHaveProperty('parCentre');
      expect(Array.isArray(res.body.data.parVaccin)).toBe(true);
      expect(Array.isArray(res.body.data.parCentre)).toBe(true);
    }, 120000);

    test('should allow nurse to view coverage', async () => {
      const res = await request(app)
        .get('/api/stats/couverture-vaccinale')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
    });

    test('should deny parent from viewing coverage', async () => {
      const res = await request(app)
        .get('/api/stats/couverture-vaccinale')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });

    test('should filter coverage by centreId', async () => {
      const res = await request(app)
        .get('/api/stats/couverture-vaccinale?centreId=1')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.centreId).toBe(1);
    });
  });

  // ==========================================
  // Session Stats
  // ==========================================
  describe('GET /api/stats/sessions', () => {
    test('should return session statistics for admin', async () => {
      const res = await request(app)
        .get('/api/stats/sessions')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('statusDistribution');
      expect(res.body.data).toHaveProperty('avgTauxRemplissage');
      expect(res.body.data).toHaveProperty('sessionsRecentes');
      expect(res.body.data).toHaveProperty('tendancesMensuelles');
      expect(Array.isArray(res.body.data.statusDistribution)).toBe(true);
    });

    test('should allow nurse to view session stats', async () => {
      const res = await request(app)
        .get('/api/stats/sessions')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
    });

    test('should deny parent from viewing session stats', async () => {
      const res = await request(app)
        .get('/api/stats/sessions')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // RDV Stats
  // ==========================================
  describe('GET /api/stats/rendez-vous', () => {
    test('should return RDV statistics for admin', async () => {
      const res = await request(app)
        .get('/api/stats/rendez-vous')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('statusDistribution');
      expect(res.body.data).toHaveProperty('tendancesMensuelles');
      expect(res.body.data).toHaveProperty('tendancesQuotidiennes');
      expect(Array.isArray(res.body.data.statusDistribution)).toBe(true);
    });

    test('should filter RDV stats by centreId', async () => {
      const res = await request(app)
        .get('/api/stats/rendez-vous?centreId=1')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.centreId).toBe(1);
    });

    test('should deny parent from viewing RDV stats', async () => {
      const res = await request(app)
        .get('/api/stats/rendez-vous')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // Stock Stats
  // ==========================================
  describe('GET /api/stats/stock', () => {
    test('should return stock statistics for admin', async () => {
      const res = await request(app)
        .get('/api/stats/stock')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('alerteStockBas');
      expect(res.body.data).toHaveProperty('totalDoses');
      expect(res.body.data).toHaveProperty('nbVaccinsDiff');
      expect(res.body.data).toHaveProperty('detailsStock');
      expect(res.body.data).toHaveProperty('gaspillage');
      expect(Array.isArray(res.body.data.detailsStock)).toBe(true);
    });

    test('should allow nurse to view stock stats', async () => {
      const res = await request(app)
        .get('/api/stats/stock')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
    });

    test('should filter stock stats by centreId', async () => {
      const res = await request(app)
        .get('/api/stats/stock?centreId=1')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.centreId).toBe(1);
    });

    test('should deny parent from viewing stock stats', async () => {
      const res = await request(app)
        .get('/api/stats/stock')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // Absenteeism Stats
  // ==========================================
  describe('GET /api/stats/absenteisme', () => {
    test('should return absenteeism statistics for admin', async () => {
      const res = await request(app)
        .get('/api/stats/absenteisme')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('totalAbsences');
      expect(res.body.data).toHaveProperty('totalRdvs');
      expect(res.body.data).toHaveProperty('tauxAbsenteisme');
      expect(res.body.data).toHaveProperty('parMois');
      expect(res.body.data).toHaveProperty('parCentre');
      expect(res.body.data).toHaveProperty('topAbsents');
    });

    test('should deny nurse from viewing absenteeism stats', async () => {
      const res = await request(app)
        .get('/api/stats/absenteisme')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(403);
    });

    test('should deny parent from viewing absenteeism stats', async () => {
      const res = await request(app)
        .get('/api/stats/absenteisme')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // Growth Stats
  // ==========================================
  describe('GET /api/stats/croissance', () => {
    test('should return growth statistics for admin', async () => {
      const res = await request(app)
        .get('/api/stats/croissance')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('totalMesures');
      expect(res.body.data).toHaveProperty('moyennesParTrancheAge');
      expect(res.body.data).toHaveProperty('mesuresRecentes');
    });

    test('should allow nurse to view growth stats', async () => {
      const res = await request(app)
        .get('/api/stats/croissance')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  // Centre Comparison
  // ==========================================
  describe('GET /api/stats/comparaison-centres', () => {
    test('should return centre comparison for admin', async () => {
      const res = await request(app)
        .get('/api/stats/comparaison-centres')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('vaccinations');
      expect(res.body.data).toHaveProperty('absenteisme');
      expect(res.body.data).toHaveProperty('stock');
      expect(Array.isArray(res.body.data.vaccinations)).toBe(true);
      expect(Array.isArray(res.body.data.absenteisme)).toBe(true);
      expect(Array.isArray(res.body.data.stock)).toBe(true);
    });

    test('should deny nurse from viewing centre comparison', async () => {
      const res = await request(app)
        .get('/api/stats/comparaison-centres')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(403);
    });

    test('should deny unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/stats/comparaison-centres');

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // Export Data
  // ==========================================
  describe('GET /api/stats/export', () => {
    test('should export vaccination data for admin', async () => {
      const res = await request(app)
        .get('/api/stats/export?type=vaccinations')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.type).toBe('vaccinations');
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('count');
    });

    test('should export session data', async () => {
      const res = await request(app)
        .get('/api/stats/export?type=sessions')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('sessions');
    });

    test('should export absenteisme data', async () => {
      const res = await request(app)
        .get('/api/stats/export?type=absenteisme')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('absenteisme');
    });

    test('should export stock data', async () => {
      const res = await request(app)
        .get('/api/stats/export?type=stock')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('stock');
    });

    test('should reject invalid export type', async () => {
      const res = await request(app)
        .get('/api/stats/export?type=invalid')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(400);
    });

    test('should reject missing export type', async () => {
      const res = await request(app)
        .get('/api/stats/export')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(400);
    });

    test('should deny nurse from exporting data', async () => {
      const res = await request(app)
        .get('/api/stats/export?type=vaccinations')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(403);
    });

    test('should support date range filter on export', async () => {
      const res = await request(app)
        .get('/api/stats/export?type=vaccinations&dateDebut=2025-01-01&dateFin=2027-12-31')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('vaccinations');
    });
  });

  // ==========================================
  // Stats Service - Core Logic
  // ==========================================
  describe('Stats Service - Core Logic', () => {
    test('should return numeric KPIs (not NaN)', async () => {
      const statsService = require('../src/services/statsService');
      const dashboard = await statsService.getDashboard();

      expect(typeof dashboard.kpis.totalBebes).toBe('number');
      expect(isNaN(dashboard.kpis.totalBebes)).toBe(false);
      expect(typeof dashboard.kpis.tauxAbsenteisme).toBe('number');
      expect(isNaN(dashboard.kpis.tauxAbsenteisme)).toBe(false);
    });

    test('should return valid coverage data structure', async () => {
      const statsService = require('../src/services/statsService');
      const coverage = await statsService.getCouvertureVaccinale();

      expect(typeof coverage.tauxCouvertureGlobal).toBe('number');
      expect(isNaN(coverage.tauxCouvertureGlobal)).toBe(false);
      expect(Array.isArray(coverage.parVaccin)).toBe(true);
    });
  });
});
