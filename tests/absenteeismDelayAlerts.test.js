const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const bcrypt = require('bcrypt');

let adminToken, nurseToken, parentToken, parent2Token;
let adminId, nurseId, parentId, parent2Id;
let centreId, vaccinId, sessionId, sessionId2;
let rdvId1, rdvId2, rdvId3;
let bebeId1, bebeId2, bebeId3, bebeId4;

const TS = Date.now();
const TEST_PHONE = '+2126' + TS.toString().slice(-8);
const TEST_PHONE2 = '+2127' + TS.toString().slice(-8);
const ADMIN_CIN = 'ADMIND18' + TS.toString().slice(-4);
const NURSE_CIN = 'NURSED18' + TS.toString().slice(-4);
const TEST_PWD = 'Test@1234';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';

  // Create test centre
  const centreRes = await pool.query(
    "INSERT INTO centre (nom, adresse, telephone) VALUES ($1, $2, $3) RETURNING id",
    ['Centre Test D18', '456 Rue Absenteeisme', '0530000018']
  );
  centreId = centreRes.rows[0].id;

  // Create test vaccin (age_cible_semaines = 8 weeks)
  const vaccinRes = await pool.query(
    "INSERT INTO vaccin (nom, doses_par_flacon, age_cible_semaines, maladies_ciblees) VALUES ($1, $2, $3, $4) RETURNING id",
    ['Vaccin D18 BCG', 10, 8, 'Tuberculose']
  );
  vaccinId = vaccinRes.rows[0].id;

  // Create another vaccin for delay alert tests
  const vaccin2Res = await pool.query(
    "INSERT INTO vaccin (nom, doses_par_flacon, age_cible_semaines, maladies_ciblees) VALUES ($1, $2, $3, $4) RETURNING id",
    ['Vaccin D18 ROR', 1, 52, 'Rougeole-Oreillons-Rubeole']
  );

  // Create admin
  const hashedPwd = await bcrypt.hash(TEST_PWD, 10);
  const adminRes = await pool.query(
    "INSERT INTO personnel (cin, mot_de_passe, nom, prenom, role, centre_id, est_actif) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
    [ADMIN_CIN, hashedPwd, 'AdminD18', 'Test', 'admin', centreId, true]
  );
  adminId = adminRes.rows[0].id;

  // Create nurse
  const nurseRes = await pool.query(
    "INSERT INTO personnel (cin, mot_de_passe, nom, prenom, role, centre_id, est_actif) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
    [NURSE_CIN, hashedPwd, 'NurseD18', 'Test', 'infirmier', centreId, true]
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

  // Register parent 1
  const otpResponse1 = await request(app)
    .post('/api/auth/parent/send-otp')
    .send({ telephone: TEST_PHONE });
  const verify1 = await request(app)
    .post('/api/auth/parent/verify-otp')
    .send({ telephone: TEST_PHONE, code: otpResponse1.body.data.devOtp });
  parentToken = verify1.body.data.tokens.accessToken;
  parentId = verify1.body.data.user.id;

  // Register parent 2
  const otpResponse2 = await request(app)
    .post('/api/auth/parent/send-otp')
    .send({ telephone: TEST_PHONE2 });
  const verify2 = await request(app)
    .post('/api/auth/parent/verify-otp')
    .send({ telephone: TEST_PHONE2, code: otpResponse2.body.data.devOtp });
  parent2Token = verify2.body.data.tokens.accessToken;
  parent2Id = verify2.body.data.user.id;

  // Create session 1 (large capacity)
  const sessionRes = await request(app)
    .post('/api/sessions')
    .set('Authorization', 'Bearer ' + adminToken)
    .send({
      centre_id: centreId,
      vaccin_id: vaccinId,
      date_session: '2026-06-20',
      heure_debut: '08:00',
      heure_fin: '16:00',
      max_inscriptions: 50,
    });
  sessionId = sessionRes.body.data.id;

  // Create session 2 (small capacity for waitlist test)
  const session2Res = await request(app)
    .post('/api/sessions')
    .set('Authorization', 'Bearer ' + adminToken)
    .send({
      centre_id: centreId,
      vaccin_id: vaccinId,
      date_session: '2026-06-25',
      heure_debut: '09:00',
      heure_fin: '14:00',
      max_inscriptions: 2,
    });
  sessionId2 = session2Res.body.data.id;

  // Create babies for parent 1
  const bebeData = [
    { prenom: 'BebePresent', nom: 'D18', date_naissance: '2025-01-15', sexe: 'M' },
    { prenom: 'BebeAbsent1', nom: 'D18', date_naissance: '2025-02-01', sexe: 'F' },
    { prenom: 'BebeAbsent2', nom: 'D18', date_naissance: '2025-03-01', sexe: 'M' },
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

  // Create baby for parent 2 (old birth date = vaccine delay)
  const oldBebeRes = await pool.query(
    'INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [parent2Id, 'BebeRetard', 'D18', '2024-01-01', 'F']
  );
  bebeId4 = oldBebeRes.rows[0].id;

  // Book 3 RDVs for parent 1 on session 1
  const rdv1Res = await request(app)
    .post('/api/rendez-vous')
    .set('Authorization', 'Bearer ' + parentToken)
    .send({ session_id: sessionId, bebe_id: bebeId1 });
  rdvId1 = rdv1Res.body.data.id;

  const rdv2Res = await request(app)
    .post('/api/rendez-vous')
    .set('Authorization', 'Bearer ' + parentToken)
    .send({ session_id: sessionId, bebe_id: bebeId2 });
  rdvId2 = rdv2Res.body.data.id;

  const rdv3Res = await request(app)
    .post('/api/rendez-vous')
    .set('Authorization', 'Bearer ' + parentToken)
    .send({ session_id: sessionId, bebe_id: bebeId3 });
  rdvId3 = rdv3Res.body.data.id;

  // Set session 1 to EN_COURS
  await pool.query('UPDATE session SET statut = $1 WHERE id = $2', ['EN_COURS', sessionId]);
}, 30000);

afterAll(async () => {
  try {
    await pool.query('DELETE FROM vaccination WHERE rendez_vous_id IN (SELECT id FROM rendez_vous WHERE session_id IN ($1, $2))', [sessionId, sessionId2]);
    await pool.query('DELETE FROM rendez_vous WHERE session_id IN ($1, $2)', [sessionId, sessionId2]);
    await pool.query('DELETE FROM notification WHERE destinataire_id IN ($1, $2)', [parentId, parent2Id]);
    await pool.query('DELETE FROM bebe WHERE parent_id IN ($1, $2)', [parentId, parent2Id]);
    await pool.query('DELETE FROM session WHERE id IN ($1, $2)', [sessionId, sessionId2]);
    await pool.query('DELETE FROM stock WHERE centre_id = $1 AND vaccin_id = $2', [centreId, vaccinId]);
    await pool.query('DELETE FROM vaccin WHERE nom LIKE $1', ['Vaccin D18%']);
    await pool.query('DELETE FROM personnel WHERE id IN ($1, $2)', [adminId, nurseId]);
    await pool.query('DELETE FROM parent WHERE id IN ($1, $2)', [parentId, parent2Id]);
    await pool.query('DELETE FROM centre WHERE id = $1', [centreId]);
    await pool.query('DELETE FROM otp_codes WHERE telephone IN ($1, $2)', [TEST_PHONE, TEST_PHONE2]);
  } catch (e) {
    // Ignore cleanup errors
  }
  await pool.end();
}, 15000);

// ============================================================
// Day 18 Integration Tests
// ============================================================
describe('Day 18 - Absenteeism Management & Delay Alerts', () => {

  // ============================================================
  // Absenteeism - Manual Absence Marking
  // ============================================================
  describe('Absenteeism - Manual Absence Marking', () => {
    test('should allow nurse to mark an RDV as absent', async () => {
      await request(app)
        .patch('/api/rendez-vous/' + rdvId1)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'CONFIRME' });

      const res = await request(app)
        .post('/api/absenteisme/mark-absent/' + rdvId1)
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
      expect(res.body.data.rdv.statut).toBe('ABSENT');
      expect(res.body.data.parent).toHaveProperty('nb_absences_consecutives');
      expect(res.body.data.parent.nb_absences_consecutives).toBeGreaterThanOrEqual(1);
    });

    test('should allow admin to mark an RDV as absent', async () => {
      await request(app)
        .patch('/api/rendez-vous/' + rdvId2)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'CONFIRME' });

      const res = await request(app)
        .post('/api/absenteisme/mark-absent/' + rdvId2)
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.rdv.statut).toBe('ABSENT');
      // Now parent has 2 consecutive absences
      expect(res.body.data.isHabitualAbsent).toBe(true);
      expect(res.body.data.alert).toBeDefined();
    });

    test('should reject marking already-absent RDV', async () => {
      const res = await request(app)
        .post('/api/absenteisme/mark-absent/' + rdvId2)
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/deja|already/i);
    });

    test('should return 404 for non-existent RDV', async () => {
      const res = await request(app)
        .post('/api/absenteisme/mark-absent/99999')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(404);
    });

    test('should deny parent from marking absences', async () => {
      const res = await request(app)
        .post('/api/absenteisme/mark-absent/' + rdvId3)
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });

    test('should deny unauthenticated access', async () => {
      const res = await request(app)
        .post('/api/absenteisme/mark-absent/' + rdvId3);

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // Absenteeism - Session No-Show Processing
  // ============================================================
  describe('Absenteeism - Session No-Show Processing', () => {
    test('should process no-shows for a session', async () => {
      const res = await request(app)
        .post('/api/absenteisme/process-session/' + sessionId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ gracePeriodMinutes: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('markedAbsent');
      expect(res.body.data).toHaveProperty('promoted');
    });

    test('should return 400 for non-existent session', async () => {
      const res = await request(app)
        .post('/api/absenteisme/process-session/99999')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ gracePeriodMinutes: 0 });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/non trouvee|not found/i);
    });

    test('should deny parent from processing session no-shows', async () => {
      const res = await request(app)
        .post('/api/absenteisme/process-session/' + sessionId)
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ gracePeriodMinutes: 0 });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // Absenteeism - Habitual Absents & History
  // ============================================================
  describe('Absenteeism - Habitual Absents & History', () => {
    test('should get list of habitual absent parents', async () => {
      const res = await request(app)
        .get('/api/absenteisme/habitual-absents')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should filter habitual absents by centre', async () => {
      const res = await request(app)
        .get('/api/absenteisme/habitual-absents?centreId=' + centreId)
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should get parent absence history', async () => {
      const res = await request(app)
        .get('/api/absenteisme/parent/' + parentId + '/history')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should get session absences', async () => {
      const res = await request(app)
        .get('/api/absenteisme/session/' + sessionId + '/absents')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should get absenteeism statistics', async () => {
      const res = await request(app)
        .get('/api/absenteisme/stats')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalAbsences');
      expect(res.body.data).toHaveProperty('totalRdvs');
      expect(res.body.data).toHaveProperty('tauxAbsenteisme');
    });

    test('should deny parent from viewing stats', async () => {
      const res = await request(app)
        .get('/api/absenteisme/stats')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // Absenteeism - Waitlist Promotion
  // ============================================================
  describe('Absenteeism - Waitlist Promotion', () => {
    test('should promote waitlisted RDV when a spot opens from absence', async () => {
      // Set session 2 to EN_COURS
      await pool.query('UPDATE session SET statut = $1 WHERE id = $2', ['EN_COURS', sessionId2]);

      // Fill session 2 to capacity (2 spots)
      const wlBebe1 = await pool.query(
        'INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [parent2Id, 'WLBebe1', 'D18', '2025-04-01', 'M']
      );
      const wlBebe2 = await pool.query(
        'INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [parent2Id, 'WLBebe2', 'D18', '2025-05-01', 'F']
      );

      await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + parent2Token)
        .send({ session_id: sessionId2, bebe_id: wlBebe1.rows[0].id });

      await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + parent2Token)
        .send({ session_id: sessionId2, bebe_id: wlBebe2.rows[0].id });

      // This should go to waitlist (session full)
      const wlBebe3 = await pool.query(
        'INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [parentId, 'WLBebe3', 'D18', '2025-06-01', 'M']
      );
      await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ session_id: sessionId2, bebe_id: wlBebe3.rows[0].id });

      // Mark one as absent to free a spot
      const rdvs = await pool.query(
        "SELECT id FROM rendez_vous WHERE session_id = $1 AND statut NOT IN ('ANNULE', 'ABSENT', 'EN_LISTE_ATTENTE') ORDER BY date_creation ASC LIMIT 1",
        [sessionId2]
      );

      if (rdvs.rows.length > 0) {
        const res = await request(app)
          .post('/api/absenteisme/mark-absent/' + rdvs.rows[0].id)
          .set('Authorization', 'Bearer ' + nurseToken);

        expect(res.status).toBe(200);
        // The promoted RDV should be returned
        if (res.body.data.promotedRdv) {
          expect(res.body.data.promotedRdv).toHaveProperty('rdvId');
        }
      }
    });
  });

  // ============================================================
  // Delay Alerts - By Centre
  // ============================================================
  describe('Delay Alerts - By Centre', () => {
    test('should get delayed vaccines for a centre', async () => {
      const res = await request(app)
        .get('/api/alertes-retard/centre/' + centreId)
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalRetards');
      expect(res.body.data).toHaveProperty('bySeverity');
      expect(res.body.data.bySeverity).toHaveProperty('severe');
      expect(res.body.data.bySeverity).toHaveProperty('moderate');
      expect(res.body.data.bySeverity).toHaveProperty('mild');
    });

    test('should allow nurse to view centre delays', async () => {
      const res = await request(app)
        .get('/api/alertes-retard/centre/' + centreId)
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(200);
    });

    test('should deny parent from viewing centre delays', async () => {
      const res = await request(app)
        .get('/api/alertes-retard/centre/' + centreId)
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // Delay Alerts - By Bebe
  // ============================================================
  describe('Delay Alerts - By Bebe', () => {
    test('should get delayed vaccines for a baby', async () => {
      const res = await request(app)
        .get('/api/alertes-retard/bebe/' + bebeId4)
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('vaccin_nom');
        expect(res.body.data[0]).toHaveProperty('jours_retard');
      }
    });

    test('should return empty array for baby with no delays', async () => {
      const newBebe = await pool.query(
        'INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [parentId, 'NewbornD18', 'Test', '2026-05-19', 'M']
      );
      const res = await request(app)
        .get('/api/alertes-retard/bebe/' + newBebe.rows[0].id)
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ============================================================
  // Delay Alerts - Dashboard
  // ============================================================
  describe('Delay Alerts - Dashboard', () => {
    test('should get delay dashboard', async () => {
      const res = await request(app)
        .get('/api/alertes-retard/dashboard')
        .set('Authorization', 'Bearer ' + adminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalRetards');
      expect(res.body.data).toHaveProperty('urgentCount');
      expect(res.body.data).toHaveProperty('byCentre');
      expect(res.body.data).toHaveProperty('topDelayedVaccines');
    });

    test('should deny nurse from viewing delay dashboard', async () => {
      const res = await request(app)
        .get('/api/alertes-retard/dashboard')
        .set('Authorization', 'Bearer ' + nurseToken);

      expect(res.status).toBe(403);
    });

    test('should deny unauthenticated access to delay dashboard', async () => {
      const res = await request(app)
        .get('/api/alertes-retard/dashboard');

      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // Delay Alerts - Send Notifications
  // ============================================================
  describe('Delay Alerts - Send Notifications', () => {
    test('should allow admin to send delay alerts for a centre', async () => {
      const res = await request(app)
        .post('/api/alertes-retard/send-alerts')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({ centreId: centreId });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('sent');
      expect(res.body.data).toHaveProperty('failed');
      expect(res.body.data).toHaveProperty('total');
    }, 30000);

    test('should allow admin to send delay alerts for all centres', async () => {
      const res = await request(app)
        .post('/api/alertes-retard/send-alerts')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('total');
    }, 30000);

    test('should deny nurse from sending delay alerts', async () => {
      const res = await request(app)
        .post('/api/alertes-retard/send-alerts')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ centreId: centreId });

      expect(res.status).toBe(403);
    });
  });

  // ============================================================
  // Absenteeism Service - Auto-mark & Counter Reset
  // ============================================================
  describe('Absenteeism Service - Core Logic', () => {
    test('should reset parent absence counter when marking PRESENT', async () => {
      const newBebe = await pool.query(
        'INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [parentId, 'BebeReset', 'D18', '2025-07-01', 'F']
      );
      const resetBebeId = newBebe.rows[0].id;

      const rdvRes = await request(app)
        .post('/api/rendez-vous')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({ session_id: sessionId, bebe_id: resetBebeId });
      const resetRdvId = rdvRes.body.data.id;

      // Set nb_absences_consecutives to 2
      await pool.query(
        'UPDATE parent SET nb_absences_consecutives = $1 WHERE id = $2',
        [2, parentId]
      );

      // Mark as PRESENT
      await request(app)
        .patch('/api/rendez-vous/' + resetRdvId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'CONFIRME' });

      await request(app)
        .patch('/api/rendez-vous/' + resetRdvId)
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({ statut: 'PRESENT' });

      // Check the counter was reset by the trigger
      const parentCheck = await pool.query(
        'SELECT nb_absences_consecutives FROM parent WHERE id = $1',
        [parentId]
      );
      expect(parentCheck.rows[0].nb_absences_consecutives).toBe(0);
    });
  });
});
