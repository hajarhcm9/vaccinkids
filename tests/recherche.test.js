const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const Recherche = require('../src/models/Recherche');

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

describe('Advanced Search & Filtering (Day 15)', () => {
  describe('GET /api/recherche/global', () => {
    it('should return search results for admin', async () => {
      const res = await request(app)
        .get('/api/recherche/global?q=test')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.bebes)).toBe(true);
      expect(Array.isArray(res.body.data.parents)).toBe(true);
      expect(Array.isArray(res.body.data.centres)).toBe(true);
      expect(Array.isArray(res.body.data.vaccins)).toBe(true);
    });

    it('should return empty results for short query', async () => {
      const res = await request(app)
        .get('/api/recherche/global?q=a')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data.bebes).toEqual([]);
    });

    it('should deny unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/recherche/global?q=test');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/recherche/rendez-vous', () => {
    it('should return filtered rendez-vous results', async () => {
      const res = await request(app)
        .get('/api/recherche/rendez-vous')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by statut', async () => {
      const res = await request(app)
        .get('/api/recherche/rendez-vous?statut=EN_ATTENTE')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/recherche/rendez-vous?date_debut=2025-01-01&date_fin=2027-12-31')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/recherche/vaccinations', () => {
    it('should return filtered vaccination results', async () => {
      const res = await request(app)
        .get('/api/recherche/vaccinations')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by centre_id', async () => {
      const res = await request(app)
        .get('/api/recherche/vaccinations?centre_id=1')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/recherche/sessions', () => {
    it('should return filtered session results', async () => {
      const res = await request(app)
        .get('/api/recherche/sessions')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by statut', async () => {
      const res = await request(app)
        .get('/api/recherche/sessions?statut=PLANIFIEE')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Recherche Model', () => {
    it('should search globally for admin', async () => {
      const data = await Recherche.searchGlobal('test', null, 'admin');
      expect(data).toBeDefined();
      expect(Array.isArray(data.bebes)).toBe(true);
      expect(Array.isArray(data.parents)).toBe(true);
    });

    it('should search rendez-vous with filters', async () => {
      const data = await Recherche.searchRendezVous({ statut: 'EN_ATTENTE' });
      expect(Array.isArray(data)).toBe(true);
    });

    it('should search vaccinations with filters', async () => {
      const data = await Recherche.searchVaccinations({});
      expect(Array.isArray(data)).toBe(true);
    });

    it('should search sessions with filters', async () => {
      const data = await Recherche.searchSessions({ centre_id: 1 });
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
