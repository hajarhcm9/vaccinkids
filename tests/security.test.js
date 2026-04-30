const request = require('supertest');
const app = require('../src/app');

describe('Security Hardening (Day 13)', () => {
  describe('Helmet - Secure Headers', () => {
    it('should set X-Content-Type-Options header', async () => {
      const res = await request(app).get('/api/vaccins');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should remove X-Powered-By header', async () => {
      const res = await request(app).get('/api/vaccins');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('should set X-Frame-Options header', async () => {
      const res = await request(app).get('/api/vaccins');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('should set Strict-Transport-Security header', async () => {
      const res = await request(app).get('/api/vaccins');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('HPP - HTTP Param Pollution', () => {
    it('should handle duplicate query parameters without crashing', async () => {
      const res = await request(app)
        .get('/api/vaccins?sort=1&sort=2');
      expect(res.status).not.toBe(500);
    });
  });

  describe('XSS Sanitization', () => {
    it('should sanitize script tags from request body', async () => {
      const res = await request(app)
        .post('/api/auth/personnel/login')
        .send({
          cin: '<script>alert("xss")</script>',
          mot_de_passe: 'test'
        });
      if (res.body) {
        expect(JSON.stringify(res.body)).not.toContain('<script>');
      }
    });
  });

  describe('CORS Configuration', () => {
    it('should set Access-Control-Allow-Origin header', async () => {
      const res = await request(app)
        .get('/api/vaccins')
        .set('Origin', 'http://localhost:3000');
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should set Access-Control-Allow-Methods on preflight', async () => {
      const res = await request(app)
        .options('/api/vaccins')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should set Access-Control-Allow-Headers on preflight', async () => {
      const res = await request(app)
        .options('/api/vaccins')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Headers', 'Authorization');
      expect(res.headers['access-control-allow-headers']).toBeDefined();
    });
  });
});
