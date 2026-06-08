const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const { requireSurface } = require('../src/middleware/surfaceAvailability');

let adminToken;
let kioskId;
let kioskCode;
let kioskSecret;
let kioskQueueEntryId;

const cookieValue = (response, name) =>
  response.headers['set-cookie']
    .map((cookie) => cookie.split(';')[0])
    .find((cookie) => cookie.startsWith(`${name}=`));

beforeAll(async () => {
  const adminLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
  adminToken = adminLogin.body.data.tokens.accessToken;

  kioskCode = `KIOSK-${Date.now()}`;
  const create = await request(app)
    .post('/api/kiosks')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ code: kioskCode, centre_id: 1 });
  kioskId = create.body.data.id;
  kioskSecret = create.body.data.secret;

  const appointment = await pool.query(
    `SELECT rdv.id AS rendez_vous_id, rdv.parent_id, rdv.bebe_id, s.id AS session_id
     FROM rendez_vous rdv JOIN session s ON s.id = rdv.session_id
     WHERE s.centre_id = 1
       AND NOT EXISTS (
         SELECT 1 FROM file_attente fa
         WHERE fa.rendez_vous_id = rdv.id AND fa.statut IN ('EN_ATTENTE', 'EN_COURS')
       )
     LIMIT 1`,
  );
  if (appointment.rows[0]) {
    const row = appointment.rows[0];
    const inserted = await pool.query(
      `INSERT INTO file_attente
       (numero_attente, rendez_vous_id, centre_id, session_id, parent_id, bebe_id, statut)
       VALUES (9876, $1, 1, $2, $3, $4, 'EN_ATTENTE') RETURNING id`,
      [row.rendez_vous_id, row.session_id, row.parent_id, row.bebe_id],
    );
    kioskQueueEntryId = inserted.rows[0].id;
  }
});

afterAll(async () => {
  if (kioskQueueEntryId)
    await pool.query('DELETE FROM file_attente WHERE id = $1', [kioskQueueEntryId]);
  await pool.query('DELETE FROM kiosk_identity WHERE id = $1', [kioskId]);
  await pool.end();
});

describe('Web admin session', () => {
  test('disabled surfaces fail closed', () => {
    const next = jest.fn();
    requireSurface(false, 'Disabled surface')({}, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  test('stores refresh token only in an HttpOnly strict cookie', async () => {
    const login = await request(app)
      .post('/api/auth/web-admin/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    expect(login.status).toBe(200);
    expect(login.body.data).toHaveProperty('accessToken');
    expect(login.body.data).not.toHaveProperty('refreshToken');
    const cookies = login.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/vk_admin_refresh=.*HttpOnly/i);
    expect(cookies).toMatch(/SameSite=Strict/i);
    expect(cookieValue(login, 'vk_admin_refresh')).toBeDefined();
    expect(cookieValue(login, 'vk_admin_csrf')).toBeDefined();
    expect(
      login.headers['set-cookie'].find((cookie) => cookie.startsWith('vk_admin_csrf=')),
    ).not.toMatch(/HttpOnly/i);
  });

  test('requires CSRF token to refresh the web session', async () => {
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/web-admin/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    expect((await agent.post('/api/auth/web-admin/refresh')).status).toBe(403);
    const refreshed = await agent
      .post('/api/auth/web-admin/refresh')
      .set('X-CSRF-Token', login.body.data.csrfToken);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data).not.toHaveProperty('refreshToken');
  });

  test('rotates refresh cookies and rejects reuse of the previous token', async () => {
    const login = await request(app)
      .post('/api/auth/web-admin/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    const oldRefresh = cookieValue(login, 'vk_admin_refresh');
    const oldCsrf = cookieValue(login, 'vk_admin_csrf');
    const refreshed = await request(app)
      .post('/api/auth/web-admin/refresh')
      .set('Cookie', [oldRefresh, oldCsrf])
      .set('X-CSRF-Token', login.body.data.csrfToken);

    expect(refreshed.status).toBe(200);
    expect(cookieValue(refreshed, 'vk_admin_refresh')).not.toBe(oldRefresh);
    expect(
      (
        await request(app)
          .post('/api/auth/web-admin/refresh')
          .set('Cookie', [oldRefresh, oldCsrf])
          .set('X-CSRF-Token', login.body.data.csrfToken)
      ).status,
    ).toBe(401);
  });

  test('logout revokes the server session and clears both cookies', async () => {
    const login = await request(app)
      .post('/api/auth/web-admin/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    const refresh = cookieValue(login, 'vk_admin_refresh');
    const csrf = cookieValue(login, 'vk_admin_csrf');
    const logout = await request(app)
      .post('/api/auth/web-admin/logout')
      .set('Cookie', [refresh, csrf])
      .set('X-CSRF-Token', login.body.data.csrfToken);

    expect(logout.status).toBe(200);
    expect(logout.headers['set-cookie'].join(';')).toMatch(/vk_admin_refresh=;/);
    expect(
      (
        await request(app)
          .post('/api/auth/web-admin/refresh')
          .set('Cookie', [refresh, csrf])
          .set('X-CSRF-Token', login.body.data.csrfToken)
      ).status,
    ).toBe(401);
  });

  test('rejects non-admin accounts and emits a strict CSP', async () => {
    expect(
      (
        await request(app)
          .post('/api/auth/web-admin/login')
          .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' })
      ).status,
    ).not.toBe(200);
    const shell = await request(app).get('/admin/');
    expect(shell.headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(shell.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
  });
});

describe('Waiting-room kiosk identity', () => {
  test('can read only its bound centre queue and cannot write', async () => {
    const login = await request(app)
      .post('/api/kiosks/login')
      .send({ code: kioskCode, secret: kioskSecret });
    expect(login.status).toBe(200);
    const token = login.body.data.accessToken;
    const decoded = jwt.decode(token);
    expect(decoded.exp - decoded.iat).toBe(login.body.data.expiresInSeconds);
    const queue = await request(app)
      .get('/api/file-attente/kiosk')
      .set('Authorization', `Bearer ${token}`);
    expect(queue.status).toBe(200);
    for (const entry of queue.body.data.entries) {
      expect(Object.keys(entry).sort()).toEqual(['numero_attente', 'statut']);
    }
    expect(
      (await request(app).get('/api/file-attente/centre/2').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch('/api/file-attente/call-next')
          .set('Authorization', `Bearer ${token}`)
          .send({ centre_id: 1 })
      ).status,
    ).toBe(403);
    for (const [method, path, body] of [
      ['post', '/api/file-attente', { centre_id: 1, bebe_id: 1 }],
      ['patch', '/api/file-attente/1/complete', {}],
      ['patch', '/api/file-attente/1/abandon', {}],
      ['post', '/api/kiosks', { code: 'DENIED', centre_id: 1 }],
    ]) {
      expect(
        (await request(app)[method](path).set('Authorization', `Bearer ${token}`).send(body))
          .status,
      ).toBe(403);
    }
  });

  test('rotation immediately revokes the previous kiosk token', async () => {
    const login = await request(app)
      .post('/api/kiosks/login')
      .send({ code: kioskCode, secret: kioskSecret });
    const token = login.body.data.accessToken;
    const rotate = await request(app)
      .post(`/api/kiosks/${kioskId}/rotate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rotate.status).toBe(200);
    kioskSecret = rotate.body.data.secret;
    expect(
      (await request(app).get('/api/file-attente/kiosk').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(401);
  });

  test('revocation immediately disables login and active tokens', async () => {
    const login = await request(app)
      .post('/api/kiosks/login')
      .send({ code: kioskCode, secret: kioskSecret });
    const token = login.body.data.accessToken;
    expect(
      (
        await request(app)
          .post(`/api/kiosks/${kioskId}/revoke`)
          .set('Authorization', `Bearer ${adminToken}`)
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get('/api/file-attente/kiosk').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(401);
    expect(
      (await request(app).post('/api/kiosks/login').send({ code: kioskCode, secret: kioskSecret }))
        .status,
    ).toBe(401);
  });
});
