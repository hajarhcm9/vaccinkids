const request = require('supertest');
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
expect(res.status).toBe(201);
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
});