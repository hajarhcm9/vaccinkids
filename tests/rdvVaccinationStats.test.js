const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const bcrypt = require('bcrypt');

let adminToken, nurseToken, parentToken, parentId;
let adminId, nurseId;
let centreId, vaccinId, sessionId;
let rdvId1, rdvId2, rdvId3;
let bebeId1, bebeId2, bebeId3;

const TS = Date.now();
const TEST_PHONE = '+2126' + TS.toString().slice(-8);
const ADMIN_CIN = 'ADMIND17' + TS.toString().slice(-4);
const NURSE_CIN = 'NURSED17' + TS.toString().slice(-4);
const TEST_PWD = 'Test@1234';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  // Create test centre directly in DB
  const centreRes = await pool.query(
    "INSERT INTO centre (nom, adresse, telephone) VALUES ($1, $2, $3) RETURNING id",
    ['Centre Test D17', '123 Rue Test', '0530000000']
  );
  centreId = centreRes.rows[0].id;

  // Create test vaccin directly in DB
  const vaccinRes = await pool.query(
    "INSERT INTO vaccin (nom, doses_par_flacon, age_cible_semaines, maladies_ciblees) VALUES ($1, $2, $3, $4) RETURNING id",
    ['Vaccin Test D17', 10, 8, 'Test Disease']
  );
  vaccinId = vaccinRes.rows[0].id;

  // Create admin personnel directly in DB
  const hashedPwd = await bcrypt.hash(TEST_PWD, 10);
  const adminRes = await pool.query(
    "INSERT INTO personnel (cin, mot_de_passe, nom, prenom, role, centre_id, est_actif) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
    [ADMIN_CIN, hashedPwd, 'Admin', 'Test', 'admin', centreId, true]
  );
  adminId = adminRes.rows[0].id;

  // Create nurse personnel directly in DB
  const nurseRes = await pool.query(
    "INSERT INTO personnel (cin, mot_de_passe, nom, prenom, role, centre_id, est_actif) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
    [NURSE_CIN, hashedPwd, 'Nurse', 'Test', 'infirmier', centreId, true]
  );
  nurseId = nurseRes.rows[0].id;

  // Login as admin
  const adminLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: ADMIN_CIN, mot_de_passe: TEST_PWD });
  adminToken = adminLogin.body.data.tokens.accessToken;

  // Login as nurse
  const nurseLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: NURSE_CIN, mot_de_passe: TEST_PWD });
  nurseToken = nurseLogin.body.data.tokens.accessToken;

  // Register parent via OTP
  const otpResponse = await request(app)
    .post('/api/auth/parent/send-otp')
    .send({ telephone: TEST_PHONE });
  const otpCode = otpResponse.body.data.devOtp;

  const verifyRes = await request(app)
    .post('/api/auth/parent/verify-otp')
    .send({ telephone: TEST_PHONE, code: otpCode });
  parentToken = verifyRes.body.data.tokens.accessToken;
  parentId = verifyRes.body.data.user.id;

  // Create session via API (as admin)
  const sessionRes = await request(app)
    .post('/api/sessions')
    .set('Authorization', 'Bearer ' + adminToken)
    .send({
      centre_id: centreId,
      vaccin_id: vaccinId,
      date_session: '2026-06-15',
      heure_debut: '08:00',
      heure_fin: '16:00',
      max_inscriptions: 50,
    });
  sessionId = sessionRes.body.data.id;

  // Set session to EN_COURS for vaccination tests
  await pool.query('UPDATE session SET statut = $1 WHERE id = $2', ['EN_COURS', sessionId]);

  // Create bebes directly in DB (parent is now registered)
  const bebeData = [
    { prenom: 'BebeMain', nom: 'Day17', date_naissance: '2025-01-15', sexe: 'M' },
    { prenom: 'BebeAbsent', nom: 'Day17', date_naissance: '2025-02-01', sexe: 'F' },
    { prenom: 'BebeCancel', nom: 'Day17', date_naissance: '2025-03-01', sexe: 'M' },
  ];

  const bebeIds = [];
  for (const b of bebeData) {
    const res = await pool.query(
      'INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [parentId, b.prenom, b.nom, b.date_naissance, b.sexe]
    );
    bebeIds.push(res.rows[0].id);
  }
  [bebeId1, bebeId2, bebeId3] = bebeIds;

  // Book 3 RDVs via API
  const bookRdv = async (bebeId) => {
    const res = await request(app)
      .post('/api/rendez-vous')
      .set('Authorization', 'Bearer ' + parentToken)
      .send({ session_id: sessionId, bebe_id: bebeId });
    return res;
  };

  const rdv1Res = await bookRdv(bebeId1);
  rdvId1 = rdv1Res.body.data.id;

  const rdv2Res = await bookRdv(bebeId2);
  rdvId2 = rdv2Res.body.data.id;

  const rdv3Res = await bookRdv(bebeId3);
  rdvId3 = rdv3Res.body.data.id;
}, 30000);

afterAll(async () => {
  try {
    await pool.query('DELETE FROM vaccination WHERE rendez_vous_id IN (SELECT id FROM rendez_vous WHERE session_id = $1)', [sessionId]);
    await pool.query('DELETE FROM rendez_vous WHERE session_id = $1', [sessionId]);
    await pool.query('DELETE FROM bebe WHERE parent_id = $1', [parentId]);
    await pool.query('DELETE FROM session WHERE id = $1', [sessionId]);
    await pool.query('DELETE FROM stock WHERE centre_id = $1 AND vaccin_id = $2', [centreId, vaccinId]);
    await pool.query('DELETE FROM vaccin WHERE id = $1', [vaccinId]);
    await pool.query('DELETE FROM personnel WHERE id IN ($1, $2)', [adminId, nurseId]);
    await pool.query('DELETE FROM parent WHERE id = $1', [parentId]);
    await pool.query('DELETE FROM centre WHERE id = $1', [centreId]);
    await pool.query('DELETE FROM otp_codes WHERE telephone = $1', [TEST_PHONE]);
  } catch (e) {
    // Ignore cleanup errors
  }
  await pool.end();
}, 15000);

// ============================================================
// Day 17 Integration Tests
// ============================================================
describe('Day 17 - RDV Management, Vaccination & Statistics', () => {

  // ============================================================
  // RDV Booking & Availability
  // ============================================================
  describe('RDV Booking & Availability', () => {
    test('should prevent duplicate booking for same session+bebe', async () => {
      const res = await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ session_id: sessionId, bebe_id: bebeId1 });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/deja|already|duplicate/i);
    });

    test('should check session availability', async () => {
      const res = await request(app)
        .get('/api/rendez-vous/session/' + sessionId + '/availability')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('max_inscriptions');
      expect(res.body.data).toHaveProperty('inscrits');
      expect(res.body.data).toHaveProperty('places_restantes');
      expect(res.body.data).toHaveProperty('disponible');
    });

    test('should list parent appointments', async () => {
      const res = await request(app)
        .get('/api/rendez-vous/me')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    test('should list all appointments for admin', async () => {
      const res = await request(app)
        .get('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should deny unauthenticated booking', async () => {
      const res = await request(app)
        .post('/api/rendez-vous')
        .send({ session_id: sessionId, bebe_id: bebeId1 });

      expect(res.status).toBe(401);
    });

    test('should deny unauthenticated availability check', async () => {
      const res = await request(app)
        .get('/api/rendez-vous/session/' + sessionId + '/availability');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // RDV Status Management
  // ============================================================
  describe('RDV Status Management', () => {
    test('should allow nurse to confirm RDV', async () => {
      const res = await request(app)
        .patch('/api/rendez-vous/' + rdvId1)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'CONFIRME' });

      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe('CONFIRME');
    });

    test('should allow nurse to mark as PRESENT', async () => {
      const res = await request(app)
        .patch('/api/rendez-vous/' + rdvId1)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'PRESENT' });

      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe('PRESENT');
    });

    test('should allow nurse to mark as ABSENT', async () => {
      const res = await request(app)
        .patch('/api/rendez-vous/' + rdvId2)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'ABSENT' });

      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe('ABSENT');
    });

    test('should reject parent cancellation once the session is in progress', async () => {
      const res = await request(app)
        .patch('/api/rendez-vous/' + rdvId3)
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ statut: 'ANNULE' });

      expect(res.status).toBe(400);
    });

    test('should deny parent from setting PRESENT status', async () => {
      // Create a new bebe + RDV for this test
      const newBebe = await pool.query(
        'INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [parentId, 'BebeDeny', 'Day17', '2025-06-01', 'M']
      );
      const denyBebeId = newBebe.rows[0].id;

      const rdvRes = await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ session_id: sessionId, bebe_id: denyBebeId });
      const denyRdvId = rdvRes.body.data.id;

      const res = await request(app)
        .patch('/api/rendez-vous/' + denyRdvId)
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ statut: 'PRESENT' });

      expect(res.status).toBe(403);
    });

    test('should return 404 for non-existent RDV status update', async () => {
      const res = await request(app)
        .patch('/api/rendez-vous/99999')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'PRESENT' });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // Vaccination Recording
  // ============================================================
  describe('Vaccination Recording', () => {
    let vaccRdvId, vaccBebeId, vaccFlaconId;

    beforeAll(async () => {
      // Create a new bebe + RDV specifically for vaccination tests
      const bebeRes = await pool.query(
        'INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [parentId, 'BebeVaccin', 'Day17', '2025-04-01', 'F']
      );
      vaccBebeId = bebeRes.rows[0].id;

      const rdvRes = await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ session_id: sessionId, bebe_id: vaccBebeId });
      vaccRdvId = rdvRes.body.data.id;
      const flaconRes = await pool.query(
        `INSERT INTO flacon
           (vaccin_id, session_id, numero_lot, fabricant, date_ouverture)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
        [vaccinId, sessionId, `LOT-D17-${TS}`, 'Test Manufacturer'],
      );
      vaccFlaconId = flaconRes.rows[0].id;

      // Mark as CONFIRME then PRESENT for vaccination
      await request(app)
        .patch('/api/rendez-vous/' + vaccRdvId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'CONFIRME' });

      await request(app)
        .patch('/api/rendez-vous/' + vaccRdvId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'PRESENT' });
    });

    test('should allow nurse to record vaccination', async () => {
      const res = await request(app)
        .post('/api/vaccinations/' + vaccRdvId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ flacon_id: vaccFlaconId, poids: 5.2, taille: 60 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.rendez_vous_id).toBe(vaccRdvId);
    });

    test('should prevent duplicate vaccination for same RDV', async () => {
      const res = await request(app)
        .post('/api/vaccinations/' + vaccRdvId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ flacon_id: vaccFlaconId, poids: 5.3 });

      expect(res.status).toBe(409);
    });

    test('should deny parent from recording vaccination', async () => {
      const res = await request(app)
        .post('/api/vaccinations/' + vaccRdvId)
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ poids: 5.0 });

      expect(res.status).toBe(403);
    });

    test('should get vaccinations by session', async () => {
      const res = await request(app)
        .get('/api/vaccinations/session/' + sessionId)
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should get vaccinations by bebe', async () => {
      const res = await request(app)
        .get('/api/vaccinations/bebe/' + vaccBebeId)
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ============================================================
  // Statistics Dashboard
  // ============================================================
  describe('Statistics Dashboard', () => {
    test('should allow admin to view dashboard', async () => {
      const res = await request(app)
        .get('/api/statistiques/dashboard')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    test('should allow admin to view monthly vaccinations', async () => {
      const res = await request(app)
        .get('/api/statistiques/vaccinations-mensuelles')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
    });

    test('should allow admin to view RDV by status', async () => {
      const res = await request(app)
        .get('/api/statistiques/rdv-par-statut')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
    });

    test('should allow admin to view stock alerts', async () => {
      const res = await request(app)
        .get('/api/statistiques/stock-alertes')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
    });

    test('should allow admin to view top vaccines', async () => {
      const res = await request(app)
        .get('/api/statistiques/top-vaccins')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
    });

    test('should allow nurse to view dashboard', async () => {
      const res = await request(app)
        .get('/api/statistiques/dashboard')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
    });

    test('should deny parent from viewing stats', async () => {
      const res = await request(app)
        .get('/api/statistiques/dashboard')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });

    test('should deny unauthenticated access to stats', async () => {
      const res = await request(app)
        .get('/api/statistiques/dashboard');

      expect(res.status).toBe(401);
    });
  });
});
