const request = require('supertest');
const app = require('../src/app');

describe('Day 21 - File d\'attente digitale', () => {
  let adminToken, nurseToken, parentToken, parentToken2;
  let adminApp, app2;
  let centreId = 1;
  let sessionId, rdvId, bebeId, bebeId2;

  beforeAll(async () => {
    delete require.cache[require.resolve('../src/app')];
    adminApp = require('../src/app');

    // Login as admin
    const adminRes = await request(adminApp)
      .post('/api/auth/personnel/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    // Login as nurse
    const nurseRes = await request(adminApp)
      .post('/api/auth/personnel/login')
      .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
    nurseToken = nurseRes.body.data.tokens.accessToken;

    // Login as parent
    await request(adminApp)
      .post('/api/auth/parent/send-otp')
      .send({ telephone: '+212600000099' });
    const otpRes = await request(adminApp)
      .post('/api/auth/parent/verify-otp')
      .send({ telephone: '+212600000099', code: '123456' });
    parentToken = otpRes.body.data.tokens.accessToken;
    const parentId = otpRes.body.data.user.id;

    // Create a session for testing
    const sessRes = await request(adminApp)
      .post('/api/sessions')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        centre_id: centreId,
        vaccin_id: 1,
        date_session: '2030-06-01',
        heure_debut: '08:00',
        heure_fin: '12:00',
        max_inscriptions: 20
      });
    sessionId = sessRes.body.data?.session?.id || sessRes.body.data?.id;

    // Create a baby
    const bebeRes = await request(adminApp)
      .post('/api/carnet/bebe')
      .set('Authorization', 'Bearer ' + parentToken)
      .send({ prenom: 'TestQueue', nom: 'Baby', date_naissance: '2024-01-15', sexe: 'M' });
    bebeId = bebeRes.body.data?.bebe?.id || bebeRes.body.data?.id;

    // Book an appointment
    const rdvRes = await request(adminApp)
      .post('/api/rendez-vous')
      .set('Authorization', 'Bearer ' + parentToken)
      .send({ session_id: sessionId, bebe_id: bebeId });
    rdvId = rdvRes.body.data?.rendez_vous?.id || rdvRes.body.data?.id;
  });

  // ==========================================
  describe('POST /api/file-attente/', () => {
    test('should allow parent to join queue', async () => {
      const res = await request(adminApp)
        .post('/api/file-attente/')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ bebe_id: bebeId, centre_id: centreId, session_id: sessionId, rendez_vous_id: rdvId });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('numero_attente');
      expect(res.body.data).toHaveProperty('statut', 'EN_ATTENTE');
    });

    test('should reject non-parent from joining', async () => {
      const res = await request(adminApp)
        .post('/api/file-attente/')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ bebe_id: bebeId, centre_id: centreId, parent_id: 1 });
      expect(res.status).toBe(403);
    });

    test('should reject without auth', async () => {
      const res = await request(adminApp)
        .post('/api/file-attente/')
        .send({ bebe_id: bebeId, centre_id: centreId });
      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  describe('GET /api/file-attente/centre/:centreId', () => {
    test('should return queue for admin', async () => {
      const res = await request(adminApp)
        .get('/api/file-attente/centre/' + centreId)
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('entries');
      expect(Array.isArray(res.body.data.entries)).toBe(true);
    });

    test('should allow nurse to view queue', async () => {
      const res = await request(adminApp)
        .get('/api/file-attente/centre/' + centreId)
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(200);
    });

    test('should reject parent from viewing centre queue', async () => {
      const res = await request(adminApp)
        .get('/api/file-attente/centre/' + centreId)
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(403);
    });

    test('should filter by statut', async () => {
      const res = await request(adminApp)
        .get('/api/file-attente/centre/' + centreId + '?statut=EN_ATTENTE')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
    });
  });

  // ==========================================
  describe('GET /api/file-attente/session/:sessionId', () => {
    test('should return queue for session', async () => {
      const res = await request(adminApp)
        .get('/api/file-attente/session/' + sessionId)
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('entries');
    });
  });

  // ==========================================
  describe('PATCH /api/file-attente/call-next', () => {
    test('should allow nurse to call next', async () => {
      const res = await request(adminApp)
        .patch('/api/file-attente/call-next')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ centre_id: centreId });
      expect(res.status).toBe(200);
    });

    test('should reject parent from calling next', async () => {
      const res = await request(adminApp)
        .patch('/api/file-attente/call-next')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ centre_id: centreId });
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  describe('PATCH /api/file-attente/:id/complete', () => {
    test('should complete current service', async () => {
      // First get the currently served entry
      const queueRes = await request(adminApp)
        .get('/api/file-attente/centre/' + centreId + '?statut=EN_COURS')
        .set('Authorization', 'Bearer ' + adminToken);
      if (queueRes.body.data.entries && queueRes.body.data.entries.length > 0) {
        const entryId = queueRes.body.data.entries[0].id;
        const res = await request(adminApp)
          .patch('/api/file-attente/' + entryId + '/complete')
          .set('Authorization', 'Bearer ' + nurseToken);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('statut', 'TERMINE');
      }
    });
  });

  // ==========================================
  describe('GET /api/file-attente/me/position', () => {
    test('should return parent queue position', async () => {
      const res = await request(adminApp)
        .get('/api/file-attente/me/position')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(200);
    });

    test('should reject non-parent', async () => {
      const res = await request(adminApp)
        .get('/api/file-attente/me/position')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  describe('GET /api/file-attente/stats', () => {
    test('should return queue stats for admin', async () => {
      const res = await request(adminApp)
        .get('/api/file-attente/stats')
        .set('Authorization', 'Bearer ' + adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('enAttente');
    });

    test('should reject parent from viewing stats', async () => {
      const res = await request(adminApp)
        .get('/api/file-attente/stats')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(403);
    });
  });
});