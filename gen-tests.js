const fs = require('fs');
fs.mkdirSync('tests', { recursive: true });

fs.writeFileSync('tests/setup.js', `process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_NAME = 'vaccinikids';
process.env.DB_USER = 'vaccinikids_user';
process.env.DB_PASSWORD = 'vaccinikids_password';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.OTP_EXPIRY_MINUTES = '5';
process.env.SMS_API_KEY = '';
process.env.PORT = '0';`);

fs.writeFileSync('tests/auth.test.js', `const request = require('supertest');
const app = require('../src/app');

describe('Auth Endpoints', () => {
  describe('GET /health', () => {
    it('should return server status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('POST /api/auth/parent/send-otp', () => {
    it('should send OTP to valid phone', async () => {
      const res = await request(app)
        .post('/api/auth/parent/send-otp')
        .send({ telephone: '0661234567' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('otpSent', true);
    });

    it('should reject invalid phone', async () => {
      const res = await request(app)
        .post('/api/auth/parent/send-otp')
        .send({ telephone: '12345' });
      expect(res.status).toBe(400);
    });

    it('should reject missing phone', async () => {
      const res = await request(app)
        .post('/api/auth/parent/send-otp')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/parent/verify-otp', () => {
    it('should verify valid OTP and return tokens', async () => {
      const sendRes = await request(app)
        .post('/api/auth/parent/send-otp')
        .send({ telephone: '0677889901' });
      const otpCode = sendRes.body.data.devOtp || sendRes.body.data.otpCode;
      if (!otpCode) {
        console.log('OTP response:', JSON.stringify(sendRes.body));
      }
      const res = await request(app)
        .post('/api/auth/parent/verify-otp')
        .send({ telephone: '0677889901', code: otpCode });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('tokens');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should reject wrong OTP', async () => {
      const res = await request(app)
        .post('/api/auth/parent/verify-otp')
        .send({ telephone: '0677889901', code: '000000' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/personnel/login', () => {
    it('should login admin', async () => {
      const res = await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should login nurse', async () => {
      const res = await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('infirmier');
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: 'ADMIN01', mot_de_passe: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent CIN', async () => {
      const res = await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: 'FAKE9999', mot_de_passe: 'anything' });
      expect(res.status).toBe(401);
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/personnel/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return profile with valid token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
      const token = loginRes.body.data.tokens.accessToken;
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ' + token);
      expect(res.status).toBe(200);
      expect(res.body.data.user.cin).toBe('ADMIN01');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.status).toBe(401);
    });
  });
});`);

fs.writeFileSync('tests/rbac.test.js', `const request = require('supertest');
const app = require('../src/app');

describe('RBAC - Role Based Access Control', () => {
  let adminToken, nurseToken, parentToken;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    const nurseRes = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
    nurseToken = nurseRes.body.data.tokens.accessToken;

    const otpRes = await request(app)
      .post('/api/auth/parent/send-otp')
      .send({ telephone: '0681122335' });
    const otpCode = otpRes.body.data.devOtp || otpRes.body.data.otpCode;
    if (otpCode) {
      const verifyRes = await request(app)
        .post('/api/auth/parent/verify-otp')
        .send({ telephone: '0681122335', code: otpCode });
      parentToken = verifyRes.body.data?.tokens?.accessToken;
    }
  });

  describe('POST /api/vaccins - Admin only', () => {
    it('should allow admin to create vaccine', async () => {
      const res = await request(app)
        .post('/api/vaccins')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          nom: 'Test Vaccine RBAC',
          doses_par_flacon: 5,
          age_cible_semaines: 8,
          maladies_ciblees: 'Test disease',
        });
      expect(res.status).toBe(201);
    });

    it('should deny nurse', async () => {
      const res = await request(app)
        .post('/api/vaccins')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({
          nom: 'Hack Vaccine',
          doses_par_flacon: 1,
          age_cible_semaines: 0,
          maladies_ciblees: 'Hack',
        });
      expect(res.status).toBe(403);
    });

    it('should deny parent', async () => {
      if (!parentToken) return;
      const res = await request(app)
        .post('/api/vaccins')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({
          nom: 'Hack Vaccine',
          doses_par_flacon: 1,
          age_cible_semaines: 0,
          maladies_ciblees: 'Hack',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('Unauthenticated access', () => {
    it('should deny sessions without token', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(401);
    });

    it('should deny vaccins POST without token', async () => {
      const res = await request(app)
        .post('/api/vaccins')
        .send({ nom: 'Hack' });
      expect(res.status).toBe(401);
    });
  });
});`);

console.log('All test files created!');