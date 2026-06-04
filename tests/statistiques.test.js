const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const Statistique = require('../src/models/Statistique');

let adminToken;
let nurseToken;
let nurseCentreId;

beforeAll(async () => {
  const adminLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
  adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.token;

  const nurseLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
  nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.token;
  nurseCentreId = nurseLogin.body.data?.user?.centre_id;
});

afterAll(async () => {
  await pool.end();
});

describe('Statistics & Dashboard (Day 12)', () => {
  describe('GET /api/statistiques/dashboard', () => {
    it('should return global dashboard for admin', async () => {
      const res = await request(app)
        .get('/api/statistiques/dashboard')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.centres_actifs).toBe('number');
      expect(typeof res.body.data.total_personnel).toBe('number');
      expect(typeof res.body.data.total_parents).toBe('number');
      expect(typeof res.body.data.total_bebes).toBe('number');
      expect(typeof res.body.data.sessions_a_venir).toBe('number');
      expect(typeof res.body.data.rdv_en_attente).toBe('number');
      expect(typeof res.body.data.rdv_confirmes).toBe('number');
      expect(typeof res.body.data.total_vaccinations).toBe('number');
      expect(typeof res.body.data.alertes_stock).toBe('number');
    });

    it('should return centre dashboard for nurse', async () => {
      const res = await request(app)
        .get('/api/statistiques/dashboard')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.sessions_a_venir).toBe('number');
      expect(typeof res.body.data.rdv_en_attente).toBe('number');
      expect(typeof res.body.data.total_vaccinations).toBe('number');
      expect(typeof res.body.data.alertes_stock).toBe('number');
    });

    it('should deny unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/statistiques/dashboard');

      expect(res.status).toBe(401);
    });

    it('should deny parent access', async () => {
      const phone = '+212600000088';
      const otpResponse = await request(app)
        .post('/api/auth/parent/send-otp')
        .send({ telephone: phone });

      const verifyRes = await request(app)
        .post('/api/auth/parent/verify-otp')
        .send({ telephone: phone, code: otpResponse.body.data.devOtp });

      const parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.token;

      const res = await request(app)
        .get('/api/statistiques/dashboard')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/statistiques/vaccinations-mensuelles', () => {
    it('should return monthly vaccination stats', async () => {
      const res = await request(app)
        .get('/api/statistiques/vaccinations-mensuelles')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should accept annee parameter', async () => {
      const res = await request(app)
        .get('/api/statistiques/vaccinations-mensuelles?annee=2026')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/statistiques/rdv-par-statut', () => {
    it('should return RDV status breakdown for admin', async () => {
      const res = await request(app)
        .get('/api/statistiques/rdv-par-statut')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by centre for nurse', async () => {
      const res = await request(app)
        .get('/api/statistiques/rdv-par-statut')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/statistiques/stock-alertes', () => {
    it('should return stock alerts', async () => {
      const res = await request(app)
        .get('/api/statistiques/stock-alertes')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/statistiques/top-vaccins', () => {
    it('should return top vaccines', async () => {
      const res = await request(app)
        .get('/api/statistiques/top-vaccins')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Statistique Model', () => {
    it('should compute global dashboard stats', async () => {
      const stats = await Statistique.getDashboardGlobal();
      expect(stats).toBeDefined();
      expect(typeof stats.centres_actifs).toBe('number');
      expect(typeof stats.total_vaccinations).toBe('number');
      expect(typeof stats.alertes_stock).toBe('number');
    });

    it('should compute centre dashboard stats', async () => {
      const stats = await Statistique.getDashboardCentre(1);
      expect(stats).toBeDefined();
      expect(typeof stats.sessions_a_venir).toBe('number');
    });

    it('should return monthly vaccinations', async () => {
      const data = await Statistique.getVaccinationsMensuelles(2026);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return RDV par statut', async () => {
      const data = await Statistique.getRdvParStatut();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return stock alertes', async () => {
      const data = await Statistique.getStockAlertes();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return top vaccins', async () => {
      const data = await Statistique.getTopVaccins();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
