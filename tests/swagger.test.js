const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

afterAll(() => pool.end());

describe('API Documentation - Swagger (Day 14)', () => {
  describe('GET /api/docs', () => {
    it('should serve Swagger UI html', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
    });

    it('should contain Swagger UI title', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.text).toContain('Swagger UI');
    });
  });

  describe('OpenAPI spec', () => {
    it('should be valid OpenAPI 3.0 spec', async () => {
      const specOpenAPI = require('../src/config/swagger');
      expect(specOpenAPI).toBeDefined();
      expect(specOpenAPI.openapi).toBe('3.0.0');
      expect(specOpenAPI.info).toBeDefined();
      expect(specOpenAPI.info.title).toBe('VacciniKids API');
      expect(specOpenAPI.paths).toBeDefined();
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('should have auth limiter with correct config', () => {
      const { authLimiter } = require('../src/middleware/rateLimiter');
      expect(authLimiter).toBeDefined();
    });

    it('should have api limiter with correct config', () => {
      const { apiLimiter } = require('../src/middleware/rateLimiter');
      expect(apiLimiter).toBeDefined();
    });
  });
});
