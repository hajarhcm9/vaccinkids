const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

afterAll(() => pool.end());

describe('Vaccination & Flacon Endpoints', () => {
  let adminToken, nurseToken, parentToken, sessionId, rdvId, flaconId, bebeId;

  beforeAll(async () => {
    // Login as admin
    const adminRes = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    // Login as nurse
    const nurseRes = await request(app)
      .post('/api/auth/personnel/login')
      .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
    nurseToken = nurseRes.body.data.tokens.accessToken;

    // Create session
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 14);
    const dateStr = nextWeek.toISOString().split('T')[0];

    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        centre_id: 1,
        vaccin_id: 1,
        date_session: dateStr,
        heure_debut: '08:00',
        heure_fin: '12:00',
        max_inscriptions: 10,
      });
    sessionId = sessionRes.body.data.id;

    // Confirm + start session
    await request(app)
      .patch('/api/sessions/' + sessionId + '/confirm')
      .set('Authorization', 'Bearer ' + adminToken);

    await request(app)
      .patch('/api/sessions/' + sessionId + '/start')
      .set('Authorization', 'Bearer ' + nurseToken);

    // Get parent token
    const sendRes = await request(app)
      .post('/api/auth/parent/send-otp')
      .send({ telephone: '0677889901' });
    const otpCode = sendRes.body.data.devOtp;
    const verifyRes = await request(app)
      .post('/api/auth/parent/verify-otp')
      .send({ telephone: '0677889901', code: otpCode });
    parentToken = verifyRes.body.data.tokens.accessToken;

    // Add baby
    const bebeRes = await request(app)
      .post('/api/carnet/bebe')
      .set('Authorization', 'Bearer ' + parentToken)
      .send({ prenom: 'VaccTest', nom: 'Day9', date_naissance: '2025-01-01', sexe: 'M' });
    bebeId = bebeRes.body.data.id;

    // Book appointment
    const rdvRes = await request(app)
      .post('/api/rendez-vous')
      .set('Authorization', 'Bearer ' + parentToken)
      .send({ session_id: sessionId, bebe_id: bebeId });
    rdvId = rdvRes.body.data.id;

    // Confirm appointment
    await request(app)
      .patch('/api/rendez-vous/' + rdvId)
      .set('Authorization', 'Bearer ' + nurseToken)
      .send({ statut: 'CONFIRME' });
  });

  describe('POST /api/flacons', () => {
    it('should open a new vial (nurse)', async () => {
      const res = await request(app)
        .post('/api/flacons')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({
          vaccin_id: 1,
          session_id: sessionId,
          numero_lot: 'TEST-LOT-001',
          fabricant: 'TestLab',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.doses_utilisees).toBe(0);
      flaconId = res.body.data.id;
    });

    it('should deny parent from opening vial', async () => {
      const res = await request(app)
        .post('/api/flacons')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({
          vaccin_id: 1,
          session_id: sessionId,
          numero_lot: 'X',
          fabricant: 'X',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/vaccinations/:rdvId', () => {
    it('should record vaccination (nurse)', async () => {
      const res = await request(app)
        .post('/api/vaccinations/' + rdvId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({
          flacon_id: flaconId,
          poids: 3.8,
          taille: 50.0,
          reactions: 'Aucune',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.rendez_vous_id).toBe(rdvId);
    });

    it('should reject duplicate vaccination', async () => {
      const res = await request(app)
        .post('/api/vaccinations/' + rdvId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ flacon_id: flaconId, poids: 3.8, taille: 50.0 });
      expect(res.status).toBe(409);
    });

    it('should deny parent from recording', async () => {
      const res = await request(app)
        .post('/api/vaccinations/999')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ flacon_id: flaconId });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/vaccinations/session/:id', () => {
    it('should return session vaccinations (nurse)', async () => {
      const res = await request(app)
        .get('/api/vaccinations/session/' + sessionId)
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/vaccinations/bebe/:id', () => {
    it('should return baby vaccination history', async () => {
      const res = await request(app)
        .get('/api/vaccinations/bebe/' + bebeId)
        .set('Authorization', 'Bearer ' + parentToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/flacons/session/:id', () => {
    it('should return session vials', async () => {
      const res = await request(app)
        .get('/api/flacons/session/' + sessionId)
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].doses_utilisees).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/flacons/:id/close', () => {
    it('should close a vial only when no dose remains', async () => {
      const vaccine = await pool.query(
        "INSERT INTO vaccin (nom, doses_par_flacon, age_cible_semaines, maladies_ciblees) VALUES ('Close One Dose', 1, 0, 'Test') RETURNING id",
      );
      const session = await pool.query(
        `INSERT INTO session
         (centre_id, vaccin_id, date_session, heure_debut, heure_fin, statut, max_inscriptions)
         VALUES (1, $1, CURRENT_DATE, '08:00', '12:00', 'EN_COURS', 5) RETURNING id`,
        [vaccine.rows[0].id],
      );
      await pool.query(
        `INSERT INTO stock (centre_id, vaccin_id, quantite_disponible, seuil_alerte)
         VALUES (1, $1, 1, 0)`,
        [vaccine.rows[0].id],
      );
      const vial = await request(app)
        .post('/api/flacons')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({
          vaccin_id: vaccine.rows[0].id,
          session_id: session.rows[0].id,
          numero_lot: 'CLOSE-ONE',
          fabricant: 'Test',
        });

      const earlyClose = await request(app)
        .patch('/api/flacons/' + vial.body.data.id + '/close')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(earlyClose.status).toBe(409);

      await request(app)
        .patch('/api/flacons/' + vial.body.data.id + '/waste')
        .set('Authorization', 'Bearer ' + nurseToken);

      const close = await request(app)
        .patch('/api/flacons/' + vial.body.data.id + '/close')
        .set('Authorization', 'Bearer ' + nurseToken);
      expect(close.status).toBe(200);
      expect(close.body.data.date_fermeture).toBeTruthy();
    });
  });
});
