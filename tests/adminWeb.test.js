'use strict';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

afterAll(() => pool.end());

describe('Phase 5 - Admin Web Interface', () => {
  test('serves the admin dashboard shell', async () => {
    const res = await request(app).get('/admin/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('VacciniKids Admin');
    expect(res.text).toContain('/admin/admin.js');
  });

  test('serves admin dashboard assets', async () => {
    const scriptRes = await request(app).get('/admin/admin.js');
    const styleRes = await request(app).get('/admin/styles.css');

    expect(scriptRes.status).toBe(200);
    expect(scriptRes.headers['content-type']).toContain('javascript');
    expect(scriptRes.text).toContain('/api/auth/web-admin/login');
    expect(scriptRes.text).not.toContain('localStorage');
    expect(scriptRes.text).not.toContain('refreshToken');

    expect(styleRes.status).toBe(200);
    expect(styleRes.headers['content-type']).toContain('text/css');
    expect(styleRes.text).toContain('.dashboard');
  });
});
