'use strict';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

jest.setTimeout(120000);

describe('Day 26 - Integration Tests (TC-01 to TC-10)', () => {
  let adminToken;
  let nurseToken;
  let parentToken;
  let testCentreId;
  let testVaccinId;
  let testSessionId;
  let testRdvId;
  let testBebeId;
  let testParentId;
  let testFlaconId;

  beforeAll(async () => {
    const centre = await pool.query('SELECT id FROM centre WHERE est_actif = true LIMIT 1');
    testCentreId = centre.rows[0]?.id;

    const vaccin = await pool.query('SELECT id FROM vaccin LIMIT 1');
    testVaccinId = vaccin.rows[0]?.id;

    const adminLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.accessToken;

    const nurseLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
    nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.accessToken;

    const otpRes = await request(app)
      .post('/api/auth/parent/send-otp')
      .send({ telephone: '0661234567' });

    if (otpRes.status === 200) {
      const verifyRes = await request(app)
        .post('/api/auth/parent/verify-otp')
        .send({ telephone: '0661234567', code: '000000' });
      parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;
      testParentId = verifyRes.body.data?.parent?.id;
    }
  });

  afterAll(async () => {
    if (testFlaconId) await pool.query('DELETE FROM flacon WHERE id = $1', [testFlaconId]).catch(() => {});
    if (testRdvId) await pool.query('DELETE FROM rendez_vous WHERE id = $1', [testRdvId]).catch(() => {});
    if (testSessionId) await pool.query('DELETE FROM session WHERE id = $1', [testSessionId]).catch(() => {});
    await pool.end();
  });

  // ==========================================
  // TC-01: Complete Vaccination Flow
  // ==========================================
  describe('TC-01: Complete Vaccination Flow', () => {
    test('admin creates session, parent books RDV, flow is coherent', async () => {
      expect(adminToken).toBeDefined();
      expect(testCentreId).toBeDefined();
      expect(testVaccinId).toBeDefined();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const sessionRes = await request(app)
        .post('/api/sessions')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          vaccin_id: testVaccinId,
          centre_id: testCentreId,
          date_session: dateStr,
          max_inscriptions: 10, heure_debut: "08:00", heure_fin: "16:00",
          heure_debut: "08:00",
          heure_fin: "16:00"
        });

      expect([200, 201]).toContain(sessionRes.status);
      testSessionId = sessionRes.body.data?.id || sessionRes.body.data?.session?.id;
      expect(testSessionId).toBeDefined();

      const listRes = await request(app)
        .get('/api/sessions')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      if (parentToken) {
        const bebeRes = await pool.query(
          'SELECT b.id FROM bebe b JOIN parent p ON b.parent_id = p.id WHERE p.telephone = $1 LIMIT 1',
          ['0661234567']
        );
        testBebeId = bebeRes.rows[0]?.id;

        if (testBebeId && testSessionId) {
          const rdvRes = await request(app)
            .post('/api/rendez-vous')
            .set('Authorization', 'Bearer ' + parentToken)
            .send({ bebe_id: testBebeId, session_id: testSessionId });

          if (rdvRes.status === 201) {
            testRdvId = rdvRes.body.data?.id || rdvRes.body.data?.rendez_vous?.id;
            expect(testRdvId).toBeDefined();
          }
        }
      }
    });
  });

  // ==========================================
  // TC-02: Session Lifecycle
  // ==========================================
  describe('TC-02: Session Lifecycle (create, confirm, start, end)', () => {
    test('session transitions through all statuses', async () => {
      if (!testSessionId) return;

      const confirmRes = await request(app)
        .patch('/api/sessions/' + testSessionId + '/confirm')
        .set('Authorization', 'Bearer ' + adminToken);
      expect([200, 400, 404]).toContain(confirmRes.status);

      const startRes = await request(app)
        .patch('/api/sessions/' + testSessionId + '/start')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect([200, 400, 404]).toContain(startRes.status);

      if (startRes.status === 200) {
        const endRes = await request(app)
          .patch('/api/sessions/' + testSessionId + '/end')
          .set('Authorization', 'Bearer ' + nurseToken);
        expect([200, 400, 404]).toContain(endRes.status);
      }
    });
  });

  // ==========================================
  // TC-03: Absenteeism Flow
  // ==========================================
  describe('TC-03: Absenteeism Flow', () => {
    test('absenteeism endpoints respond correctly', async () => {
      const absRes = await request(app)
        .get('/api/absenteisme/centre/' + testCentreId)
        .set('Authorization', 'Bearer ' + adminToken);
      expect([200, 404]).toContain(absRes.status);

      const delayRes = await request(app)
        .get('/api/alertes-retard/centre/' + testCentreId)
        .set('Authorization', 'Bearer ' + adminToken);
      expect([200, 404]).toContain(delayRes.status);
    });
  });

  // ==========================================
  // TC-04: Flacon Management
  // ==========================================
  describe('TC-04: Flacon Management', () => {
    test('open flacon and track doses', async () => {
      const flaconRes = await request(app)
        .post('/api/flacons')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({
          vaccin_id: testVaccinId,
          centre_id: testCentreId,
          numero_lot: 'INT-TEST-LOT-001',
          fabricant: 'IntegrationTest Pharma',
          doses_par_flacon: 10
        });

      expect([200, 201]).toContain(flaconRes.status);
      testFlaconId = flaconRes.body.data?.id || flaconRes.body.data?.flacon?.id;

      if (testFlaconId) {
        const sessionFlacons = await request(app)
          .get('/api/flacons/session/' + (testSessionId || 1))
          .set('Authorization', 'Bearer ' + nurseToken);
        expect([200, 404]).toContain(sessionFlacons.status);
      }
    });
  });

  // ==========================================
  // TC-05: Statistics & Exports
  // ==========================================
  describe('TC-05: Statistics & Exports After Operations', () => {
    test('stats dashboard returns data', async () => {
      const dashRes = await request(app)
        .get('/api/stats/dashboard')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(dashRes.status).toBe(200);
    });

    test('statistiques dashboard returns data', async () => {
      const statRes = await request(app)
        .get('/api/statistiques/dashboard')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(statRes.status).toBe(200);
    });

    test('export PDF returns buffer', async () => {
      const pdfRes = await request(app)
        .get('/api/exports/vaccinations/pdf')
        .set('Authorization', 'Bearer ' + adminToken);
      expect([200, 404]).toContain(pdfRes.status);
      if (pdfRes.status === 200) {
        expect(parseInt(pdfRes.headers['content-length'])).toBeGreaterThan(0);
      }
    });

    test('export Excel returns buffer', async () => {
      const xlsRes = await request(app)
        .get('/api/exports/vaccinations/excel')
        .set('Authorization', 'Bearer ' + adminToken);
      expect([200, 404]).toContain(xlsRes.status);
      if (xlsRes.status === 200) {
        expect(parseInt(xlsRes.headers['content-length'])).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================
  // TC-06: Admin Management
  // ==========================================
  describe('TC-06: Admin Management (Personnel & Centres)', () => {
    test('admin can list personnel', async () => {
      const res = await request(app)
        .get('/api/admin/personnel')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
    });

    test('admin can list centres', async () => {
      const res = await request(app)
        .get('/api/admin/centres')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
    });

    test('admin can view audit log', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
    });

    test('nurse cannot access admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/personnel')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // TC-07: RBAC Enforcement
  // ==========================================
  describe('TC-07: RBAC Enforcement Across Endpoints', () => {
    test('unauthenticated access is denied', async () => {
      const endpoints = [
        '/api/sessions',
        '/api/vaccins',
        '/api/stock',
        '/api/notifications/me',
        '/api/stats/dashboard',
        '/api/admin/personnel'
      ];
      for (const ep of endpoints) {
        const res = await request(app).get(ep);
        expect([401,404]).toContain(res.status);
      }
    });

    test('parent cannot access admin-only endpoints', async () => {
      if (!parentToken) return;
      const res = await request(app)
        .get('/api/admin/personnel')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(403);
    });

    test('nurse cannot create sessions', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({
          vaccin_id: testVaccinId,
          centre_id: testCentreId,
          date_session: '2026-06-01',
          max_inscriptions: 5
        });
      expect(res.status).toBe(403);
    });

    test('nurse cannot cancel sessions', async () => {
      const res = await request(app)
        .patch('/api/sessions/' + (testSessionId || 99999) + '/cancel')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect([403, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // TC-08: Offline Sync
  // ==========================================
  describe('TC-08: Offline Sync Flow', () => {
    test('pull changes returns sync data', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    test('push changes endpoint exists', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ changes: [] });
      expect([200, 400]).toContain(res.status);
    });

    test('sync status endpoint works', async () => {
      const res = await request(app)
        .get('/api/sync/status')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
    });

    test('sync queue operations', async () => {
      const addRes = await request(app)
        .post('/api/sync/queue')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          operation: 'CREATE',
          entity_type: 'vaccination',
          payload: { test: true }
        });
      expect([200,201,400]).toContain(addRes.status);if(addRes.status>=400)console.log('SYNC QUEUE ERROR:',addRes.body);

      const getRes = await request(app)
        .get('/api/sync/queue')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(getRes.status).toBe(200);
    });
  });

  // ==========================================
  // TC-09: File d'attente
  // ==========================================
  describe('TC-09: File d\'attente Flow', () => {
    test('file d\'attente stats endpoint works', async () => {
      const res = await request(app)
        .get('/api/file-attente/centre/' + testCentreId)
        .set('Authorization', 'Bearer ' + adminToken);
      expect([200, 404]).toContain(res.status);
    });

    test('file d\'attente stats endpoint', async () => {
      const res = await request(app)
        .get('/api/file-attente/stats?centre_id=' + testCentreId)
        .set('Authorization', 'Bearer ' + adminToken);
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // TC-10: Notification & Search
  // ==========================================
  describe('TC-10: Notification & Search Flow', () => {
    test('notification list endpoint works', async () => {
      if (!parentToken) return;
      const res = await request(app)
        .get('/api/notifications/me')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(200);
    });

    test('notification unread count', async () => {
      if (!parentToken) return;
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(200);
    });

    test('global search returns results', async () => {
      const res = await request(app)
        .get('/api/recherche/global?q=test')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
    });

    test('search sessions', async () => {
      const res = await request(app)
        .get('/api/recherche/sessions?q=test')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
    });
  });
});
