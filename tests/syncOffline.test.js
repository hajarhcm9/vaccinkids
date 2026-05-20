'use strict';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

jest.setTimeout(60000);

describe('Day 24 - Offline-first / Sync', () => {
  let adminToken;
  let nurseToken;
  let parentToken;
  let testBebeId;

  const adminCIN = 'SYNADM01';
  const nurseCIN = 'SYNNRS01';

  beforeAll(async () => {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('SynAdmin12!', 10);

    await pool.query('DELETE FROM sync_queue');
    await pool.query('DELETE FROM personnel WHERE cin IN ($1, $2)', [adminCIN, nurseCIN]);

    const centreResult = await pool.query('SELECT id FROM centre LIMIT 1');
    const centreId = centreResult.rows[0]?.id || 1;

    await pool.query(
      'INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif, failed_login_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)',
      [adminCIN, 'SynAdmin', 'Test', hashedPassword, 'admin', centreId, true]
    );

    const nursePassword = await bcrypt.hash('SynNurse12!', 10);
    await pool.query(
      'INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif, failed_login_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)',
      [nurseCIN, 'SynNurse', 'Test', nursePassword, 'infirmier', centreId, true]
    );

    const adminLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: adminCIN, mot_de_passe: 'SynAdmin12!' });
    adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.accessToken;

    const nurseLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: nurseCIN, mot_de_passe: 'SynNurse12!' });
    nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.accessToken;

    // Get parent token via OTP
    const parentPhone = '+212600000099';
    await request(app)
      .post('/api/auth/parent/send-otp')
      .send({ telephone: parentPhone });
    const verifyRes = await request(app)
      .post('/api/auth/parent/verify-otp')
      .send({ telephone: parentPhone, code: '123456' });
    parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM sync_queue');
    await pool.query('DELETE FROM personnel WHERE cin IN ($1, $2)', [adminCIN, nurseCIN]);
    await pool.end();
  });

  // =====================
  // Pull Sync
  // =====================
  describe('GET /api/sync/pull - Pull Changes', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/sync/pull');
      expect(res.status).toBe(401);
    });

    it('should return changes with timestamp', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.changes).toBeDefined();
      expect(res.body.data.timestamp).toBeDefined();
    });

    it('should accept since parameter for delta sync', async () => {
      const since = new Date(Date.now() - 3600000).toISOString();
      const res = await request(app)
        .get('/api/sync/pull?since=' + encodeURIComponent(since))
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data.changes).toBeDefined();
    });

    it('should return changes for parent role', async () => {
      if (!parentToken) return;
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(200);
      expect(res.body.data.changes).toBeDefined();
    });

    it('should return changes for nurse role', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(200);
      expect(res.body.data.changes).toBeDefined();
    });
  });

  // =====================
  // Push Sync
  // =====================
  describe('POST /api/sync/push - Push Changes', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .send({ items: [] });
      expect(res.status).toBe(401);
    });

    it('should require items array', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject non-array items', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ items: 'not-array' });
      expect(res.status).toBe(400);
    });

    it('should reject more than 100 items', async () => {
      var items = [];
      for (var i = 0; i < 101; i++) {
        items.push({ operation: 'CREATE', entity_type: 'rendez_vous', payload: {} });
      }
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ items: items });
      expect(res.status).toBe(400);
    });

    it('should reject invalid entity type', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          items: [{
            operation: 'CREATE',
            entity_type: 'invalid_table',
            payload: { nom: 'Test' }
          }]
        });
      expect(res.status).toBe(200);
      expect(res.body.data[0].status).toBe('REJECTED');
    });
  });

  // =====================
  // Sync Status
  // =====================
  describe('GET /api/sync/status - Sync Status', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/sync/status');
      expect(res.status).toBe(401);
    });

    it('should return sync status', async () => {
      const res = await request(app)
        .get('/api/sync/status')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.pendingCount).toBe('number');
      expect(typeof res.body.data.conflictCount).toBe('number');
    });
  });

  // =====================
  // Queue Management
  // =====================
  describe('POST /api/sync/queue - Add to Queue', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/sync/queue')
        .send({ operation: 'CREATE', entity_type: 'rendez_vous', payload: {} });
      expect(res.status).toBe(401);
    });

    it('should require operation, entity_type and payload', async () => {
      const res = await request(app)
        .post('/api/sync/queue')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject invalid operation', async () => {
      const res = await request(app)
        .post('/api/sync/queue')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ operation: 'INVALID', entity_type: 'rendez_vous', payload: {} });
      expect(res.status).toBe(400);
    });

    it('should add item to queue', async () => {
      const res = await request(app)
        .post('/api/sync/queue')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          operation: 'CREATE',
          entity_type: 'rendez_vous',
          payload: { nom: 'TestSync' }
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('PENDING');
    });
  });

  // =====================
  // Get Queue
  // =====================
  describe('GET /api/sync/queue - Get Queue', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/sync/queue');
      expect(res.status).toBe(401);
    });

    it('should return pending queue items', async () => {
      const res = await request(app)
        .get('/api/sync/queue')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // =====================
  // Conflict Resolution
  // =====================
  describe('POST /api/sync/resolve/:id - Resolve Conflict', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/sync/resolve/999')
        .send({ resolution: 'SERVER_WINS' });
      expect(res.status).toBe(401);
    });

    it('should require resolution field', async () => {
      const res = await request(app)
        .post('/api/sync/resolve/999')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject invalid resolution', async () => {
      const res = await request(app)
        .post('/api/sync/resolve/999')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ resolution: 'INVALID' });
      expect(res.status).toBe(400);
    });

    it('should return error for non-existent queue item', async () => {
      const res = await request(app)
        .post('/api/sync/resolve/999999')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ resolution: 'SERVER_WINS' });
      expect([400, 404, 500]).toContain(res.status);
    });
  });

  // =====================
  // Sync Queue Table Structure
  // =====================
  describe('Sync Queue Database', () => {
    it('should have sync_queue table with correct columns', async () => {
      const result = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'sync_queue'"
      );
      const columns = result.rows.map(function(r) { return r.column_name; });
      expect(columns).toContain('user_id');
      expect(columns).toContain('operation');
      expect(columns).toContain('entity_type');
      expect(columns).toContain('payload');
      expect(columns).toContain('status');
      expect(columns).toContain('conflict_resolution');
    });

    it('should enforce valid operations', async () => {
      await expect(
        pool.query(
          'INSERT INTO sync_queue (user_id, user_role, operation, entity_type, payload, client_timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [1, 'admin', 'INVALID_OP', 'test', '{}', new Date(), 'PENDING']
        )
      ).rejects.toThrow();
    });

    it('should enforce valid status values', async () => {
      await expect(
        pool.query(
          'INSERT INTO sync_queue (user_id, user_role, operation, entity_type, payload, client_timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [1, 'admin', 'CREATE', 'test', '{}', new Date(), 'INVALID_STATUS']
        )
      ).rejects.toThrow();
    });
  });
});
