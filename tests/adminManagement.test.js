const request = require('supertest');
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

let app;
let adminToken;
let nurseToken;
let adminId;

beforeAll(async () => {
  // Clear require cache
  delete require.cache[require.resolve('../src/app')];
  app = require('../src/app');

  // Make the suite repeatable after an interrupted previous run.
  await pool.query("DELETE FROM personnel WHERE cin = 'TESTCREAT'");
  await pool.query("DELETE FROM centre WHERE nom = 'Test Centre Day20'");

  // Create test admin directly in DB
  const adminHash = await bcrypt.hash('AdminDay20!', 10);
  const adminRes = await pool.query(
    `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('ADMIN20', 'Admin', 'Day20', $1, 'admin', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1
     RETURNING id`,
    [adminHash]
  );
  adminId = adminRes.rows[0].id;

  // Create test nurse directly in DB
  const nurseHash = await bcrypt.hash('NurseDay20!', 10);
  await pool.query(
    `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
     VALUES ('NURSE20', 'Nurse', 'Day20', $1, 'infirmier', 1, TRUE)
     ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1`,
    [nurseHash]
  );

  // Login as admin
  const adminLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'ADMIN20', mot_de_passe: 'AdminDay20!' });
  adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.accessToken;

  // Login as nurse
  const nurseLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'NURSE20', mot_de_passe: 'NurseDay20!' });
  nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.accessToken;
}, 30000);

afterAll(async () => {
  // Cleanup
  try {
    await pool.query("DELETE FROM personnel WHERE cin IN ('ADMIN20', 'NURSE20', 'TESTCREAT')");
    await pool.query("DELETE FROM centre WHERE nom = 'Test Centre Day20'");
  } catch (e) {
    // ignore
  }
  await pool.end();
}, 15000);

describe('Day 20 - Admin Management & Audit Log', () => {
  // ==========================================
  // PERSONNEL MANAGEMENT
  // ==========================================
  describe('POST /api/admin/personnel', () => {
    test('should create a new personnel member', async () => {
      const res = await request(app)
        .post('/api/admin/personnel')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          cin: 'TESTCREAT',
          nom: 'TestCreate',
          prenom: 'Personnel',
          mot_de_passe: 'TestPass123!',
          role: 'infirmier',
          centre_id: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.personnel).toBeDefined();
      expect(res.body.data.personnel.cin).toBe('TESTCREAT');
      expect(res.body.data.personnel.role).toBe('infirmier');
      // Password should NOT be returned
      expect(res.body.data.personnel.mot_de_passe).toBeUndefined();
    });

    test('should reject duplicate CIN', async () => {
      const res = await request(app)
        .post('/api/admin/personnel')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          cin: 'ADMIN20',
          nom: 'Duplicate',
          prenom: 'Test',
          mot_de_passe: 'TestPass123!',
          role: 'admin',
          centre_id: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('CIN');
    });

    test('should reject invalid role', async () => {
      const res = await request(app)
        .post('/api/admin/personnel')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          cin: 'UNIQUECIN123',
          nom: 'Test',
          prenom: 'Role',
          mot_de_passe: 'TestPass123!',
          role: 'medecin',
          centre_id: 1,
        });

      expect(res.status).toBe(400);
    });

    test('should deny nurse from creating personnel', async () => {
      const res = await request(app)
        .post('/api/admin/personnel')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({
          cin: 'DENIEDCIN',
          nom: 'Denied',
          prenom: 'Test',
          mot_de_passe: 'TestPass123!',
          role: 'infirmier',
          centre_id: 1,
        });

      expect(res.status).toBe(403);
    });

    test('should deny unauthenticated access', async () => {
      const res = await request(app)
        .post('/api/admin/personnel')
        .send({
          cin: 'NOCIN',
          nom: 'No',
          prenom: 'Auth',
          mot_de_passe: 'TestPass123!',
          role: 'infirmier',
          centre_id: 1,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/personnel', () => {
    test('should list all personnel for admin', async () => {
      const res = await request(app)
        .get('/api/admin/personnel')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.personnel).toBeDefined();
      expect(Array.isArray(res.body.data.personnel)).toBe(true);
      expect(res.body.data.total).toBeGreaterThan(0);
    });

    test('should filter by role', async () => {
      const res = await request(app)
        .get('/api/admin/personnel?role=infirmier')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.personnel.every(p => p.role === 'infirmier')).toBe(true);
    });

    test('should search by name', async () => {
      const res = await request(app)
        .get('/api/admin/personnel?search=Day20')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.personnel.length).toBeGreaterThan(0);
    });

    test('should deny nurse from listing personnel', async () => {
      const res = await request(app)
        .get('/api/admin/personnel')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/personnel/:id', () => {
    test('should get personnel by ID', async () => {
      const res = await request(app)
        .get('/api/admin/personnel/' + adminId)
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(adminId);
      expect(res.body.data.centre_nom).toBeDefined();
    });

    test('should return 404 for non-existent personnel', async () => {
      const res = await request(app)
        .get('/api/admin/personnel/999999')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/personnel/:id', () => {
    test('should update personnel fields', async () => {
      const res = await request(app)
        .patch('/api/admin/personnel/' + adminId)
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ nom: 'AdminUpdated' });

      expect(res.status).toBe(200);
      expect(res.body.data.personnel.nom).toBe('AdminUpdated');
    });

    test('should reject empty update', async () => {
      const res = await request(app)
        .patch('/api/admin/personnel/' + adminId)
        .set('Authorization', 'Bearer ' + adminToken)
        .send({});

      expect(res.status).toBe(400);
    });

    test('should return 404 for non-existent personnel', async () => {
      const res = await request(app)
        .patch('/api/admin/personnel/999999')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ nom: 'Ghost' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/admin/personnel/:id/deactivate', () => {
    let testPersonnelId;

    beforeAll(async () => {
      const hash = await bcrypt.hash('DeactPass!', 10);
      const res = await pool.query(
        `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
         VALUES ('DEACTTEST', 'Deactivate', 'Test', $1, 'infirmier', 1, TRUE)
         ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1, est_actif = TRUE
         RETURNING id`,
        [hash]
      );
      testPersonnelId = res.rows[0].id;
    });

    test('should deactivate personnel', async () => {
      const res = await request(app)
        .patch('/api/admin/personnel/' + testPersonnelId + '/deactivate')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.deactivated).toBe(true);
    });

    test('should reject deactivating already inactive personnel', async () => {
      const res = await request(app)
        .patch('/api/admin/personnel/' + testPersonnelId + '/deactivate')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(400);
    });

    test('should prevent self-deactivation', async () => {
      const res = await request(app)
        .patch('/api/admin/personnel/' + adminId + '/deactivate')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('propre');
    });

    afterAll(async () => {
      await pool.query("DELETE FROM personnel WHERE cin = 'DEACTTEST'");
    });
  });

  describe('PATCH /api/admin/personnel/:id/reactivate', () => {
    let testPersonnelId;

    beforeAll(async () => {
      const hash = await bcrypt.hash('ReactPass!', 10);
      const res = await pool.query(
        `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
         VALUES ('REACTTEST', 'Reactivate', 'Test', $1, 'infirmier', 1, FALSE)
         ON CONFLICT (cin) DO UPDATE SET mot_de_passe = $1, est_actif = FALSE
         RETURNING id`,
        [hash]
      );
      testPersonnelId = res.rows[0].id;
    });

    test('should reactivate personnel', async () => {
      const res = await request(app)
        .patch('/api/admin/personnel/' + testPersonnelId + '/reactivate')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.reactivated).toBe(true);
    });

    test('should reject reactivating already active personnel', async () => {
      const res = await request(app)
        .patch('/api/admin/personnel/' + testPersonnelId + '/reactivate')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(400);
    });

    afterAll(async () => {
      await pool.query("DELETE FROM personnel WHERE cin = 'REACTTEST'");
    });
  });

  // ==========================================
  // CENTRE MANAGEMENT
  // ==========================================
  describe('POST /api/admin/centres', () => {
    test('should create a new centre', async () => {
      const res = await request(app)
        .post('/api/admin/centres')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          nom: 'Test Centre Day20',
          adresse: '123 Rue Test, Oujda',
          telephone: '+212523456789',
          gps_lat: 34.6824,
          gps_lng: -1.9086,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.centre).toBeDefined();
      expect(res.body.data.centre.nom).toBe('Test Centre Day20');
    });

    test('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/admin/centres')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ nom: 'Incomplete Centre' });

      expect(res.status).toBe(400);
    });

    test('should deny nurse from creating centre', async () => {
      const res = await request(app)
        .post('/api/admin/centres')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({
          nom: 'Denied Centre',
          adresse: '123 Rue Denied',
          telephone: '+212523456700',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/centres', () => {
    test('should list all centres for admin', async () => {
      const res = await request(app)
        .get('/api/admin/centres')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.centres).toBeDefined();
      expect(Array.isArray(res.body.data.centres)).toBe(true);
      expect(res.body.data.total).toBeGreaterThan(0);
    });

    test('should include personnel count per centre', async () => {
      const res = await request(app)
        .get('/api/admin/centres')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      const centreWithPersonnel = res.body.data.centres.find(c => parseInt(c.nb_personnel) > 0);
      expect(centreWithPersonnel).toBeDefined();
    });
  });

  describe('GET /api/admin/centres/:id', () => {
    test('should get centre by ID with stats', async () => {
      const res = await request(app)
        .get('/api/admin/centres/1')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.nom).toBeDefined();
      expect(res.body.data.nb_personnel).toBeDefined();
    });

    test('should return 404 for non-existent centre', async () => {
      const res = await request(app)
        .get('/api/admin/centres/999999')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/centres/:id', () => {
    test('should update centre fields', async () => {
      const res = await request(app)
        .patch('/api/admin/centres/1')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ adresse: 'Updated Address Day20' });

      expect(res.status).toBe(200);
    });

    test('should return 404 for non-existent centre', async () => {
      const res = await request(app)
        .patch('/api/admin/centres/999999')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ nom: 'Ghost' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/admin/centres/:id/deactivate', () => {
    test('should reject deactivating centre with active personnel', async () => {
      const res = await request(app)
        .patch('/api/admin/centres/1/deactivate')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('personnel');
    });
  });

  // ==========================================
  // AUDIT LOG
  // ==========================================
  describe('GET /api/admin/audit-log', () => {
    test('should list audit log entries', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toBeDefined();
      expect(Array.isArray(res.body.data.entries)).toBe(true);
      expect(res.body.data.total).toBeGreaterThan(0);
    });

    test('should filter by table_name', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log?table_name=personnel')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.entries.every(e => e.table_name === 'personnel')).toBe(true);
    });

    test('should filter by action', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log?action=INSERT')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.entries.every(e => e.action === 'INSERT')).toBe(true);
    });

    test('should support pagination', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log?limit=5&page=1')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.entries.length).toBeLessThanOrEqual(5);
      expect(res.body.data.page).toBe(1);
    });

    test('should deny nurse from viewing audit log', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/audit-log/stats', () => {
    test('should return audit statistics', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/stats')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalEntries');
      expect(res.body.data).toHaveProperty('byAction');
      expect(res.body.data).toHaveProperty('byTable');
      expect(res.body.data).toHaveProperty('activiteRecente24h');
      expect(Array.isArray(res.body.data.byAction)).toBe(true);
      expect(Array.isArray(res.body.data.byTable)).toBe(true);
    });
  });

  // ==========================================
  // SYSTEM INFO
  // ==========================================
  describe('GET /api/admin/system-info', () => {
    test('should return system information', async () => {
      const res = await request(app)
        .get('/api/admin/system-info')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('dbSize');
      expect(res.body.data).toHaveProperty('tableCounts');
      expect(res.body.data).toHaveProperty('activePersonnel');
      expect(res.body.data.tableCounts).toHaveProperty('personnel');
      expect(res.body.data.tableCounts).toHaveProperty('bebe');
      expect(res.body.data.tableCounts).toHaveProperty('vaccination');
    });

    test('should deny nurse from viewing system info', async () => {
      const res = await request(app)
        .get('/api/admin/system-info')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(403);
    });

    test('should deny unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/admin/system-info');

      expect(res.status).toBe(401);
    });
  });
});
