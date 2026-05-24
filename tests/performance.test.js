'use strict';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

jest.setTimeout(30000);

describe('Day 27 - Performance Tests', () => {
  let adminToken;
  let nurseToken;
  let testCentreId;
  let testVaccinId;

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
  });

  afterAll(async () => {
    await pool.end();
  });

  function timed(fn) {
    const start = Date.now();
    return fn().then(result => ({ result, elapsed: Date.now() - start }));
  }

  // ==========================================
  // TC-P01: Critical Endpoints Response Time
  // ==========================================
  describe('TC-P01: Critical Endpoints Response Time (< 3s)', () => {
    test('GET /api/sessions responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/sessions').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/sessions/today responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/sessions/today').set('Authorization', 'Bearer ' + nurseToken)
      );
      expect([200, 404]).toContain(result.status);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/vaccins responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/vaccins').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/stock/centre/:id responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/stock/centre/' + testCentreId).set('Authorization', 'Bearer ' + adminToken)
      );
      expect([200, 404]).toContain(result.status);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/admin/personnel responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/admin/personnel').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/admin/centres responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/admin/centres').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/admin/audit-log responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/admin/audit-log').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/stats/dashboard responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/stats/dashboard').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/statistiques/dashboard responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/statistiques/dashboard').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/file-attente/centre/:id responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/file-attente/centre/' + testCentreId).set('Authorization', 'Bearer ' + adminToken)
      );
      expect([200, 404]).toContain(result.status);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/recherche/global responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/recherche/global?q=test').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('GET /api/sync/status responds within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/sync/status').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });
  });

  // ==========================================
  // TC-P02: Concurrent Request Handling
  // ==========================================
  describe('TC-P02: Concurrent Request Handling', () => {
    test('handles 10 concurrent GET /api/sessions', async () => {
      const promises = Array(10).fill(null).map(() =>
        request(app).get('/api/sessions').set('Authorization', 'Bearer ' + adminToken)
      );
      const start = Date.now();
      const results = await Promise.all(promises);
      const elapsed = Date.now() - start;
      expect(results.filter(r => r.status === 200).length).toBe(10);
      expect(elapsed).toBeLessThan(6000);
    });

    test('handles 10 concurrent GET /api/vaccins', async () => {
      const promises = Array(10).fill(null).map(() =>
        request(app).get('/api/vaccins').set('Authorization', 'Bearer ' + adminToken)
      );
      const start = Date.now();
      const results = await Promise.all(promises);
      const elapsed = Date.now() - start;
      expect(results.filter(r => r.status === 200).length).toBe(10);
      expect(elapsed).toBeLessThan(6000);
    });

    test('handles 5 concurrent stats dashboard requests', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(app).get('/api/stats/dashboard').set('Authorization', 'Bearer ' + adminToken)
      );
      const start = Date.now();
      const results = await Promise.all(promises);
      const elapsed = Date.now() - start;
      expect(results.filter(r => r.status === 200).length).toBe(5);
      expect(elapsed).toBeLessThan(10000);
    });

    test('handles mixed concurrent requests', async () => {
      const endpoints = [
        () => request(app).get('/api/sessions').set('Authorization', 'Bearer ' + adminToken),
        () => request(app).get('/api/vaccins').set('Authorization', 'Bearer ' + adminToken),
        () => request(app).get('/api/admin/personnel').set('Authorization', 'Bearer ' + adminToken),
        () => request(app).get('/api/admin/centres').set('Authorization', 'Bearer ' + adminToken),
        () => request(app).get('/api/recherche/global?q=vaccin').set('Authorization', 'Bearer ' + adminToken),
      ];
      const start = Date.now();
      const results = await Promise.all(endpoints.map(fn => fn()));
      const elapsed = Date.now() - start;
      expect(results.filter(r => r.status < 500).length).toBe(5);
      expect(elapsed).toBeLessThan(6000);
    });
  });

  // ==========================================
  // TC-P03: Heavy Query Performance
  // ==========================================
  describe('TC-P03: Heavy Query Performance', () => {
    test('audit log with pagination within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/admin/audit-log?page=1&limit=50').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('global search with complex query within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/recherche/global?q=vaccination').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });

    test('sync pull within 5s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/sync/pull').set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(5000);
    });

    test('absenteeism by centre within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/absenteisme/centre/' + testCentreId).set('Authorization', 'Bearer ' + adminToken)
      );
      expect([200, 404]).toContain(result.status);
      expect(elapsed).toBeLessThan(3000);
    });

    test('delay alerts by centre within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/alertes-retard/centre/' + testCentreId).set('Authorization', 'Bearer ' + adminToken)
      );
      expect(result.status).toBe(200);
      expect(elapsed).toBeLessThan(3000);
    });
  });

  // ==========================================
  // TC-P04: Export Generation Performance
  // ==========================================
  describe('TC-P04: Export Generation Performance', () => {
    test('vaccinations PDF within 5s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/exports/vaccinations/pdf').set('Authorization', 'Bearer ' + adminToken)
      );
      if (result.status === 200) expect(elapsed).toBeLessThan(5000);
    });

    test('vaccinations Excel within 5s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/exports/vaccinations/excel').set('Authorization', 'Bearer ' + adminToken)
      );
      if (result.status === 200) expect(elapsed).toBeLessThan(5000);
    });

    test('sessions PDF within 5s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/exports/sessions/pdf').set('Authorization', 'Bearer ' + adminToken)
      );
      if (result.status === 200) expect(elapsed).toBeLessThan(5000);
    });

    test('stock Excel within 5s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).get('/api/exports/stock/excel').set('Authorization', 'Bearer ' + adminToken)
      );
      if (result.status === 200) expect(elapsed).toBeLessThan(5000);
    });
  });

  // ==========================================
  // TC-P05: Database Connection Pool Stability
  // ==========================================
  describe('TC-P05: Database Connection Pool Stability', () => {
    test('20 sequential queries without exhaustion', async () => {
      const start = Date.now();
      for (let i = 0; i < 20; i++) {
        const result = await pool.query('SELECT 1 as test');
        expect(result.rows[0].test).toBe(1);
      }
      expect(Date.now() - start).toBeLessThan(5000);
    });

    test('10 concurrent queries complete', async () => {
      const start = Date.now();
      const results = await Promise.all(Array(10).fill(null).map(() => pool.query('SELECT 1 as test')));
      expect(results.every(r => r.rows[0].test === 1)).toBe(true);
      expect(Date.now() - start).toBeLessThan(3000);
    });

    test('pool remains usable after stress', async () => {
      await Promise.all(Array(15).fill(null).map(() => pool.query('SELECT COUNT(*) FROM personnel')));
      const result = await pool.query('SELECT 1 as alive');
      expect(result.rows[0].alive).toBe(1);
    });
  });

  // ==========================================
  // TC-P06: Write Operation Performance
  // ==========================================
  describe('TC-P06: Write Operation Performance', () => {
    test('session creation within 3s', async () => {
      if (!testCentreId || !testVaccinId) return;
      const d = new Date(); d.setDate(d.getDate() + 30);
      const { result, elapsed } = await timed(() =>
        request(app).post('/api/sessions').set('Authorization', 'Bearer ' + adminToken).send({
          vaccin_id: testVaccinId, centre_id: testCentreId,
          date_session: d.toISOString().split('T')[0],
          max_inscriptions: 10, heure_debut: '08:00', heure_fin: '16:00'
        })
      );
      expect([200, 201, 400]).toContain(result.status);
      expect(elapsed).toBeLessThan(3000);
      if ([200, 201].includes(result.status)) {
        const id = result.body.data?.id || result.body.data?.session?.id;
        if (id) await pool.query('DELETE FROM session WHERE id = $1', [id]).catch(() => {});
      }
    });

    test('flacon creation within 3s', async () => {
      if (!testCentreId || !testVaccinId) return;
      const { result, elapsed } = await timed(() =>
        request(app).post('/api/flacons').set('Authorization', 'Bearer ' + nurseToken).send({
          vaccin_id: testVaccinId, centre_id: testCentreId,
          numero_lot: 'PERF-TEST-LOT', fabricant: 'PerformanceTest', doses_par_flacon: 10
        })
      );
      expect([200, 201, 400]).toContain(result.status);
      expect(elapsed).toBeLessThan(3000);
      if ([200, 201].includes(result.status)) {
        const id = result.body.data?.id || result.body.data?.flacon?.id;
        if (id) await pool.query('DELETE FROM flacon WHERE id = $1', [id]).catch(() => {});
      }
    });

    test('sync queue add within 3s', async () => {
      const { result, elapsed } = await timed(() =>
        request(app).post('/api/sync/queue').set('Authorization', 'Bearer ' + adminToken).send({
          operation: 'CREATE', entity_type: 'vaccination', payload: { perf_test: true }
        })
      );
      expect([200, 201, 400]).toContain(result.status);
      expect(elapsed).toBeLessThan(3000);
    });
  });
});
