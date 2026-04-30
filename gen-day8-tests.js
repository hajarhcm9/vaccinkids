const fs = require('fs');

function w(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('Created: ' + file);
}

w(
  'tests/rdv.test.js',
  `const request = require('supertest');
const app = require('../src/app');

describe('Rendez-vous Endpoints', () => {
  let parentToken;
  let adminToken;
  let nurseToken;
  let sessionId;
  let bebeId;
  let rdvId;

  beforeAll(async () => {
    // Login as admin and create a session
    const adminRes = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        centre_id: 1,
        vaccin_id: 3,
        date_session: dateStr,
        heure_debut: '09:00',
        heure_fin: '13:00',
        max_inscriptions: 5,
      });
    sessionId = sessionRes.body.data.id;

    // Login as nurse
    const nurseRes = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
    nurseToken = nurseRes.body.data.tokens.accessToken;

    // Get parent token via OTP
    const sendRes = await request(app)
      .post('/api/auth/parent/send-otp')
      .send({ telephone: '0681223355' });

    const otpCode = sendRes.body.data.devOtp;
    const verifyRes = await request(app)
      .post('/api/auth/parent/verify-otp')
      .send({ telephone: '0681223355', code: otpCode });
    parentToken = verifyRes.body.data.tokens.accessToken;

    // Add a baby
    const bebeRes = await request(app)
      .post('/api/carnet/bebe')
      .set('Authorization', 'Bearer ' + parentToken)
      .send({
        prenom: 'TestBebe',
        nom: 'Day8',
        date_naissance: '2025-03-01',
        sexe: 'F',
      });
    bebeId = bebeRes.body.data.id;
  });

  describe('POST /api/rendez-vous', () => {
    it('should book an appointment (parent)', async () => {
      const res = await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ session_id: sessionId, bebe_id: bebeId });
      expect(res.status).toBe(201);
      expect(res.body.data.statut).toBe('EN_ATTENTE');
      expect(res.body.data.session_id).toBe(sessionId);
      rdvId = res.body.data.id;
    });

    it('should reject duplicate booking for same baby+session', async () => {
      const res = await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ session_id: sessionId, bebe_id: bebeId });
      expect(res.status).toBe(400);
    });

    it('should reject booking by non-parent', async () => {
      const res = await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ session_id: sessionId, bebe_id: bebeId });
      expect(res.status).toBe(403);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/api/rendez-vous')
        .send({ session_id: sessionId, bebe_id: bebeId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/rendez-vous/session/:id/availability', () => {
    it('should return availability info', async () => {
      const res = await request(app)
        .get('/api/rendez-vous/session/' + sessionId + '/availability')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('places_restantes');
      expect(res.body.data).toHaveProperty('disponible');
      expect(res.body.data.inscrits).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/rendez-vous/:id - Status updates', () => {
    it('should allow nurse to confirm', async () => {
      const res = await request(app)
        .patch('/api/rendez-vous/' + rdvId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'CONFIRME' });
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe('CONFIRME');
    });

    it('should reject parent setting CONFIRME', async () => {
      const res = await request(app)
        .patch('/api/rendez-vous/' + rdvId)
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ statut: 'CONFIRME' });
      expect(res.status).toBe(403);
    });

    it('should allow parent to cancel', async () => {
      const res = await request(app)
        .patch('/api/rendez-vous/' + rdvId)
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ statut: 'ANNULE' });
      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe('ANNULE');
    });
  });

  describe('GET /api/rendez-vous/me', () => {
    it('should return parent appointments', async () => {
      const res = await request(app)
        .get('/api/rendez-vous/me')
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/rendez-vous/session/:id', () => {
    it('should allow nurse to view session RDVs', async () => {
      const res = await request(app)
        .get('/api/rendez-vous/session/' + sessionId)
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should deny parent from viewing session RDVs', async () => {
      const res = await request(app)
        .get('/api/rendez-vous/session/' + sessionId)
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(403);
    });
  });
});
`,
);

console.log('\nDay 8 test file created!');
