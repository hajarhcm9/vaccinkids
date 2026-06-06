const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

let adminToken;
let kioskId;
let kioskCode;
let kioskSecret;

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
});

afterAll(() => pool.end());

describe('Web admin session', () => {
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
});

describe('Waiting-room kiosk identity', () => {
  test('can read only its bound centre queue and cannot write', async () => {
    const login = await request(app)
      .post('/api/kiosks/login')
      .send({ code: kioskCode, secret: kioskSecret });
    expect(login.status).toBe(200);
    const token = login.body.data.accessToken;
    expect((await request(app).get('/api/file-attente/kiosk').set('Authorization', `Bearer ${token}`)).status).toBe(200);
    expect(
      (
        await request(app)
          .get('/api/file-attente/centre/2')
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch('/api/file-attente/call-next')
          .set('Authorization', `Bearer ${token}`)
          .send({ centre_id: 1 })
      ).status,
    ).toBe(403);
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
});
