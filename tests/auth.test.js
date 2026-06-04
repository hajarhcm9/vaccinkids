const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

afterAll(() => pool.end());

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

      const otp = await pool.query(
        `SELECT code_hash
         FROM otp_codes
         WHERE telephone = $1
         ORDER BY created_at DESC LIMIT 1`,
        ['+212661234567'],
      );
      expect(otp.rows[0].code_hash).toHaveLength(64);
      expect(otp.rows[0].code_hash).not.toContain(res.body.data.devOtp);
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

    it('should reject the test bypass when no active OTP was requested', async () => {
      const res = await request(app)
        .post('/api/auth/parent/verify-otp')
        .send({ telephone: '0677889910', code: '123456' });
      expect(res.status).toBe(401);
    });

    it('should invalidate an OTP after the maximum failed attempts', async () => {
      const phone = '0677889903';
      await request(app).post('/api/auth/parent/send-otp').send({ telephone: phone });

      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await request(app)
          .post('/api/auth/parent/verify-otp')
          .send({ telephone: phone, code: '000000' });
        expect(res.status).toBe(401);
      }

      const otp = await pool.query(
        `SELECT failed_attempts, est_verifie
         FROM otp_codes
         WHERE telephone = $1
         ORDER BY created_at DESC LIMIT 1`,
        ['+212677889903'],
      );
      expect(otp.rows[0]).toMatchObject({ failed_attempts: 5, est_verifie: true });
    });
  });

  describe('PUT /api/auth/parent/fcm-token', () => {
    it('should allow a parent to register an FCM token', async () => {
      const phone = '0677889902';
      const sendRes = await request(app)
        .post('/api/auth/parent/send-otp')
        .send({ telephone: phone });
      const otpCode = sendRes.body.data.devOtp || sendRes.body.data.otpCode;
      const verifyRes = await request(app)
        .post('/api/auth/parent/verify-otp')
        .send({ telephone: phone, code: otpCode });
      const token = verifyRes.body.data.tokens.accessToken;
      const parentId = verifyRes.body.data.user.id;

      const res = await request(app)
        .put('/api/auth/parent/fcm-token')
        .set('Authorization', 'Bearer ' + token)
        .send({ fcm_token: 'test-fcm-token-1234567890' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ parent_id: parentId, push_enabled: true });

      const dbRes = await pool.query('SELECT fcm_token FROM parent WHERE id = $1', [parentId]);
      expect(dbRes.rows[0].fcm_token).toBe('test-fcm-token-1234567890');
    });

    it('should reject FCM token registration for personnel', async () => {
      const loginRes = await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
      const token = loginRes.body.data.tokens.accessToken;

      const res = await request(app)
        .put('/api/auth/parent/fcm-token')
        .set('Authorization', 'Bearer ' + token)
        .send({ fcm_token: 'test-fcm-token-1234567890' });

      expect(res.status).toBe(403);
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
      const stored = await pool.query(
        'SELECT token_hash FROM refresh_tokens WHERE user_id = $1 AND user_role = $2 ORDER BY id DESC LIMIT 1',
        [res.body.data.user.id, 'admin'],
      );
      expect(stored.rows[0].token_hash).toHaveLength(64);
      expect(stored.rows[0].token_hash).not.toBe(res.body.data.tokens.refreshToken);
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

  describe('POST /api/auth/refresh', () => {
    it('should rotate refresh tokens and reject reuse', async () => {
      const login = await request(app)
        .post('/api/auth/personnel/login')
        .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
      const original = login.body.data.tokens.refreshToken;

      const rotated = await request(app).post('/api/auth/refresh').send({ refreshToken: original });
      expect(rotated.status).toBe(200);
      expect(rotated.body.data.tokens.refreshToken).not.toBe(original);

      const reused = await request(app).post('/api/auth/refresh').send({ refreshToken: original });
      expect(reused.status).toBe(401);

      const familyRevoked = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: rotated.body.data.tokens.refreshToken });
      expect(familyRevoked.status).toBe(401);
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
