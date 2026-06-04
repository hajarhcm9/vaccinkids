'use strict';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

jest.setTimeout(60000);

describe('Secure offline synchronization', () => {
  let adminToken;
  let nurseToken;
  let parentToken;
  let nurseId;
  let ownCentreId;
  let otherCentreId;
  let ownSessionId;
  let secondOwnSessionId;
  let otherSessionId;
  let ownBebeId;
  let otherBebeId;
  let otherParentId;

  const adminCIN = 'SYNADM01';
  const nurseCIN = 'SYNNRS01';
  const otherCentreName = 'Sync Other Centre';

  const command = (overrides = {}) => ({
    client_operation_id: 'sync-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    client_timestamp: new Date(Date.now() + 60000).toISOString(),
    operation: 'UPDATE',
    entity_type: 'session',
    entity_id: ownSessionId,
    payload: { statut: 'EN_COURS' },
    ...overrides,
  });

  beforeAll(async () => {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('SynAdmin12!', 10);
    const nursePassword = await bcrypt.hash('SynNurse12!', 10);

    await pool.query('DELETE FROM sync_queue');
    await pool.query('DELETE FROM personnel WHERE cin IN ($1, $2)', [adminCIN, nurseCIN]);
    await pool.query('DELETE FROM centre WHERE nom = $1', [otherCentreName]);

    const centreResult = await pool.query('SELECT id FROM centre ORDER BY id LIMIT 1');
    ownCentreId = centreResult.rows[0].id;
    otherCentreId = (
      await pool.query('INSERT INTO centre (nom, adresse, telephone) VALUES ($1, $2, $3) RETURNING id', [
        otherCentreName,
        'Outside nurse scope',
        '+212500000099',
      ])
    ).rows[0].id;

    await pool.query(
      'INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif, failed_login_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)',
      [adminCIN, 'SynAdmin', 'Test', hashedPassword, 'admin', ownCentreId, true],
    );
    nurseId = (
      await pool.query(
        'INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif, failed_login_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, 0) RETURNING id',
        [nurseCIN, 'SynNurse', 'Test', nursePassword, 'infirmier', ownCentreId, true],
      )
    ).rows[0].id;

    const vaccinId = (await pool.query('SELECT id FROM vaccin ORDER BY id LIMIT 1')).rows[0].id;
    const insertSession = async (centreId) =>
      (
        await pool.query(
          "INSERT INTO session (centre_id, vaccin_id, date_session, heure_debut, heure_fin, statut, max_inscriptions) VALUES ($1, $2, CURRENT_DATE + 30, '09:00', '11:00', 'CONFIRMEE', 10) RETURNING id",
          [centreId, vaccinId],
        )
      ).rows[0].id;
    ownSessionId = await insertSession(ownCentreId);
    secondOwnSessionId = await insertSession(ownCentreId);
    otherSessionId = await insertSession(otherCentreId);

    const adminLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: adminCIN, mot_de_passe: 'SynAdmin12!' });
    adminToken = adminLogin.body.data.tokens.accessToken;

    const nurseLogin = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: nurseCIN, mot_de_passe: 'SynNurse12!' });
    nurseToken = nurseLogin.body.data.tokens.accessToken;

    const parentPhone = '+212600000099';
    await request(app).post('/api/auth/parent/send-otp').send({ telephone: parentPhone });
    const verifyRes = await request(app)
      .post('/api/auth/parent/verify-otp')
      .send({ telephone: parentPhone, code: '123456' });
    parentToken = verifyRes.body.data.tokens.accessToken;
    const parentId = (await pool.query('SELECT id FROM parent WHERE telephone = $1', [parentPhone]))
      .rows[0].id;
    otherParentId = (
      await pool.query(
        'INSERT INTO parent (telephone, nom, prenom) VALUES ($1, $2, $3) RETURNING id',
        ['+212600000098', 'Other', 'Parent'],
      )
    ).rows[0].id;
    ownBebeId = (
      await pool.query(
        "INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe, code_qr) VALUES ($1, 'Own', 'Baby', CURRENT_DATE - 100, 'F', $2) RETURNING id",
        [parentId, 'SYNC-OWN-BABY'],
      )
    ).rows[0].id;
    otherBebeId = (
      await pool.query(
        "INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe, code_qr) VALUES ($1, 'Other', 'Baby', CURRENT_DATE - 100, 'M', $2) RETURNING id",
        [otherParentId, 'SYNC-OTHER-BABY'],
      )
    ).rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM sync_queue');
    await pool.query('DELETE FROM bebe WHERE id = ANY($1::int[])', [[ownBebeId, otherBebeId]]);
    await pool.query('DELETE FROM parent WHERE id = $1', [otherParentId]);
    await pool.query('DELETE FROM session WHERE id = ANY($1::int[])', [
      [ownSessionId, secondOwnSessionId, otherSessionId],
    ]);
    await pool.query('DELETE FROM personnel WHERE cin IN ($1, $2)', [adminCIN, nurseCIN]);
    await pool.query('DELETE FROM centre WHERE id = $1', [otherCentreId]);
    await pool.end();
  });

  describe('GET /api/sync/pull', () => {
    it('requires authentication and rejects an invalid cursor', async () => {
      expect((await request(app).get('/api/sync/pull')).status).toBe(401);
      const invalid = await request(app)
        .get('/api/sync/pull?since=not-a-date')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(invalid.status).toBe(400);
    });

    it('returns bounded changes and a stable upper-bound timestamp', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          changes: expect.any(Object),
          hasMore: expect.any(Object),
          timestamp: expect.any(String),
        }),
      );
    });

    it('scopes nurse pull data to the assigned centre', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(200);
      const sessionIds = res.body.data.changes.session.map((session) => session.id);
      expect(sessionIds).toContain(ownSessionId);
      expect(sessionIds).not.toContain(otherSessionId);
    });

    it('scopes parent data and executes vaccination filtering without hiding schema errors', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.changes.vaccination)).toBe(true);
      const bebeIds = res.body.data.changes.bebe.map((bebe) => bebe.id);
      expect(bebeIds).toContain(ownBebeId);
      expect(bebeIds).not.toContain(otherBebeId);
    });
  });

  describe('POST /api/sync/push', () => {
    it('requires authentication, staff role and a bounded items array', async () => {
      expect((await request(app).post('/api/sync/push').send({ items: [] })).status).toBe(401);
      expect(
        (
          await request(app)
            .post('/api/sync/push')
            .set('Authorization', 'Bearer ' + parentToken)
            .send({ items: [] })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .post('/api/sync/push')
            .set('Authorization', 'Bearer ' + adminToken)
            .send({ items: new Array(101).fill({}) })
        ).status,
      ).toBe(400);
    });

    it('rejects create, delete, unsupported entities and identity fields', async () => {
      const attacks = [
        command({ operation: 'CREATE' }),
        command({ operation: 'DELETE' }),
        command({ entity_type: 'vaccination' }),
        command({ payload: { statut: 'EN_COURS', centre_id: otherCentreId } }),
        command({ payload: { statut: 'EN_COURS', parent_id: otherParentId } }),
      ];
      for (const attack of attacks) {
        const res = await request(app)
          .post('/api/sync/push')
          .set('Authorization', 'Bearer ' + nurseToken)
          .send({ items: [attack] });
        expect([400, 403]).toContain(res.status);
      }
    });

    it('rejects a nurse command targeting another centre', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ items: [command({ entity_id: otherSessionId })] });
      expect(res.status).toBe(403);
      const session = await pool.query('SELECT statut FROM session WHERE id = $1', [otherSessionId]);
      expect(session.rows[0].statut).toBe('CONFIRMEE');
    });

    it('applies an authorized command once and treats its replay idempotently', async () => {
      const item = command({ client_operation_id: 'nurse-own-session-start' });
      const first = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ items: [item] });
      const replay = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ items: [item] });

      expect(first.status).toBe(200);
      expect(first.body.data[0].status).toBe('APPLIED');
      expect(replay.body.data[0]).toEqual(expect.objectContaining({ status: 'APPLIED', replay: true }));
      const logs = await pool.query(
        'SELECT COUNT(*)::int AS count FROM sync_queue WHERE user_id = $1 AND client_operation_id = $2',
        [nurseId, item.client_operation_id],
      );
      expect(logs.rows[0].count).toBe(1);

      const alteredReplay = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ items: [{ ...item, payload: { statut: 'TERMINEE' } }] });
      expect(alteredReplay.status).toBe(409);
    });

    it('rolls back the whole batch when one command is unauthorized', async () => {
      const items = [
        command({
          client_operation_id: 'batch-valid-before-forbidden',
          entity_id: secondOwnSessionId,
        }),
        command({
          client_operation_id: 'batch-forbidden',
          entity_id: otherSessionId,
        }),
      ];
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ items });
      expect(res.status).toBe(403);
      const session = await pool.query('SELECT statut FROM session WHERE id = $1', [secondOwnSessionId]);
      expect(session.rows[0].statut).toBe('CONFIRMEE');
    });

    it('records stale commands as SERVER_WINS conflicts', async () => {
      const item = command({
        client_operation_id: 'admin-stale-command',
        entity_id: otherSessionId,
        client_timestamp: new Date(0).toISOString(),
      });
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ items: [item] });
      expect(res.status).toBe(200);
      expect(res.body.data[0].status).toBe('CONFLICT');

      const resolve = await request(app)
        .post('/api/sync/resolve/' + res.body.data[0].queueItemId)
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ resolution: 'SERVER_WINS' });
      expect(resolve.status).toBe(200);
    });

    it('lets an administrator inspect and resolve a nurse conflict', async () => {
      const item = command({
        client_operation_id: 'nurse-stale-command',
        entity_id: ownSessionId,
        client_timestamp: new Date(0).toISOString(),
        payload: { statut: 'TERMINEE' },
      });
      const conflict = await request(app)
        .post('/api/sync/push')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ items: [item] });
      expect(conflict.body.data[0].status).toBe('CONFLICT');

      const queue = await request(app)
        .get('/api/sync/queue')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(queue.body.data.map((entry) => entry.id)).toContain(conflict.body.data[0].queueItemId);

      const resolve = await request(app)
        .post('/api/sync/resolve/' + conflict.body.data[0].queueItemId)
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ resolution: 'SERVER_WINS' });
      expect(resolve.status).toBe(200);
    });
  });

  describe('queue and conflict surface', () => {
    it('does not expose arbitrary queue insertion', async () => {
      const res = await request(app)
        .post('/api/sync/queue')
        .set('Authorization', 'Bearer ' + adminToken)
        .send(command());
      expect(res.status).toBe(404);
    });

    it('refuses CLIENT_WINS resolution', async () => {
      const res = await request(app)
        .post('/api/sync/resolve/1')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ resolution: 'CLIENT_WINS' });
      expect(res.status).toBe(400);
    });

    it('keeps status and queue reads authenticated', async () => {
      expect((await request(app).get('/api/sync/status')).status).toBe(401);
      const status = await request(app)
        .get('/api/sync/status')
        .set('Authorization', 'Bearer ' + nurseToken);
      const queue = await request(app)
        .get('/api/sync/queue')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(status.status).toBe(200);
      expect(queue.status).toBe(200);
      expect(Array.isArray(queue.body.data)).toBe(true);
    });
  });

  it('adds the idempotency key, unique index and SERVER_WINS-only constraint', async () => {
    const columns = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'sync_queue'",
    );
    expect(columns.rows.map((row) => row.column_name)).toContain('client_operation_id');

    const indexes = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'sync_queue' AND indexname = 'uq_sync_queue_client_operation'",
    );
    expect(indexes.rows).toHaveLength(1);

    await expect(
      pool.query(
        "INSERT INTO sync_queue (user_id, user_role, operation, entity_type, payload, status, conflict_resolution) VALUES (999999, 'admin', 'UPDATE', 'session', '{}', 'CONFLICT', 'CLIENT_WINS')",
      ),
    ).rejects.toThrow();
  });
});
