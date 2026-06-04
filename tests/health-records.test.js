const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

afterAll(() => pool.end());

describe('Day 10 - Health Records & Stock', () => {
  let adminToken, nurseToken, parentToken, bebeId;

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    // Nurse login
    const nurseRes = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
    nurseToken = nurseRes.body.data.tokens.accessToken;

    // Parent login
    const sendRes = await request(app)
      .post('/api/auth/parent/send-otp')
      .send({ telephone: '0677889901' });
    const otpCode = sendRes.body.data.devOtp;
    const verifyRes = await request(app)
      .post('/api/auth/parent/verify-otp')
      .send({ telephone: '0677889901', code: otpCode });
    parentToken = verifyRes.body.data.tokens.accessToken;

    const bebeRes = await request(app)
      .post('/api/carnet/bebe')
      .set('Authorization', 'Bearer ' + parentToken)
      .send({
        prenom: 'Day10Baby',
        nom: 'Health',
        date_naissance: '2025-01-01',
        sexe: 'M',
      });
    bebeId = bebeRes.body.data.id;
  });

  describe('Stock Management', () => {
    it('should get stock for centre (admin)', async () => {
      const res = await request(app)
        .get('/api/stock/centre/1')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should get stock for centre (nurse)', async () => {
      const res = await request(app)
        .get('/api/stock/centre/1')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(200);
    });

    it('should deny parent from viewing stock', async () => {
      const res = await request(app)
        .get('/api/stock/centre/1')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(403);
    });

    it('should get low stock alerts', async () => {
      const res = await request(app)
        .get('/api/stock/centre/1/low')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should upsert stock (admin)', async () => {
      const res = await request(app)
        .post('/api/stock')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ centre_id: 1, vaccin_id: 1, quantite_disponible: 42, seuil_alerte: 10 });
      expect(res.status).toBe(201);
      expect(res.body.data.quantite_disponible).toBe(42);
    });

    it('should deny nurse from upserting stock', async () => {
      const res = await request(app)
        .post('/api/stock')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ centre_id: 1, vaccin_id: 1, quantite_disponible: 99 });
      expect(res.status).toBe(403);
    });
  });

  describe('Vaccine CRUD', () => {
    it('should list vaccines', async () => {
      const res = await request(app)
        .get('/api/vaccins')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should update vaccine (admin)', async () => {
      const res = await request(app)
        .patch('/api/vaccins/1')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ maladies_ciblees: 'Tuberculose' });
      expect(res.status).toBe(200);
      expect(res.body.data.maladies_ciblees).toBe('Tuberculose');
    });

    it('should deny nurse from updating vaccine', async () => {
      const res = await request(app)
        .patch('/api/vaccins/1')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ nom: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('Complete Carnet', () => {
    it('should return complete health record', async () => {
      const res = await request(app)
        .get('/api/carnet/bebe/' + bebeId + '/complete')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('bebe');
      expect(res.body.data).toHaveProperty('stats');
      expect(res.body.data).toHaveProperty('vaccinations');
      expect(res.body.data).toHaveProperty('croissance');
      expect(res.body.data).toHaveProperty('delayed_vaccines');
      expect(res.body.data.bebe.prenom).toBe('Day10Baby');
    });

    it('should include age_jours in bebe data', async () => {
      const res = await request(app)
        .get('/api/carnet/bebe/' + bebeId + '/complete')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.body.data.bebe).toHaveProperty('age_jours');
      expect(res.body.data.bebe.age_jours).toBeGreaterThan(0);
    });
  });
});
