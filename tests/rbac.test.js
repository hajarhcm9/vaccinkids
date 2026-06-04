const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

afterAll(() => pool.end());

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
});
