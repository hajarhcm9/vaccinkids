'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Phase 5 - Waiting Room Display', () => {
  test('serves the waiting-room display shell', async () => {
    const res = await request(app).get('/waiting-room/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain("Affichage file d'attente");
    expect(res.text).toContain('/waiting-room/display.js');
  });

  test('serves waiting-room display assets', async () => {
    const scriptRes = await request(app).get('/waiting-room/display.js');
    const styleRes = await request(app).get('/waiting-room/styles.css');

    expect(scriptRes.status).toBe(200);
    expect(scriptRes.headers['content-type']).toContain('javascript');
    expect(scriptRes.text).toContain('/api/file-attente/centre/');

    expect(styleRes.status).toBe(200);
    expect(styleRes.headers['content-type']).toContain('text/css');
    expect(styleRes.text).toContain('.hero-call');
  });
});
