const express = require('express');
const request = require('supertest');
const { createLimiter } = require('../src/middleware/rateLimiter');
const { safeSpreadsheetValue } = require('../src/utils/spreadsheet');

describe('Backend operational hardening', () => {
  test('rate limit profiles can enforce independent limits', async () => {
    const app = express();
    app.use(createLimiter('otp', { max: 1, validate: false }));
    app.get('/', (_req, res) => res.json({ ok: true }));

    expect((await request(app).get('/')).status).toBe(200);
    const blocked = await request(app).get('/');
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/Too many requests/i);
  });

  test.each(['=1+1', '+SUM(A1:A2)', '-2+3', '@command'])(
    'neutralizes spreadsheet formula value %s',
    (value) => {
      expect(safeSpreadsheetValue(value)).toBe(`'${value}`);
    },
  );

  test('does not modify normal spreadsheet text', () => {
    expect(safeSpreadsheetValue('VacciniKids')).toBe('VacciniKids');
  });
});
