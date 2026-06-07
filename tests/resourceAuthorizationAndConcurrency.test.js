const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const TokenService = require('../src/services/tokenService');
const bookingService = require('../src/services/bookingService');
const clinicalWorkflow = require('../src/services/clinicalWorkflowService');
const fileAttenteService = require('../src/services/fileAttenteService');

describe('Resource authorization and clinical concurrency', () => {
  const ids = {};
  let nurseToken;
  let parentToken;

  beforeAll(async () => {
    const centre = await pool.query(
      "INSERT INTO centre (nom, adresse, telephone) VALUES ('P0 Centre 2', 'Test', '0500000099') RETURNING id",
    );
    ids.centre2 = centre.rows[0].id;
    const nurse = await pool.query(
      `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id)
       VALUES ('P0NURSE2', 'Scope', 'Nurse', 'unused', 'infirmier', $1) RETURNING id`,
      [ids.centre2],
    );
    ids.nurse2 = nurse.rows[0].id;
    nurseToken = TokenService.generateAccessToken({ userId: ids.nurse2, role: 'infirmier' });

    const parent1 = await pool.query(
      "INSERT INTO parent (telephone, nom, prenom) VALUES ('0600000901', 'P0', 'Parent1') RETURNING id",
    );
    const parent2 = await pool.query(
      "INSERT INTO parent (telephone, nom, prenom) VALUES ('0600000902', 'P0', 'Parent2') RETURNING id",
    );
    ids.parent1 = parent1.rows[0].id;
    ids.parent2 = parent2.rows[0].id;
    parentToken = TokenService.generateAccessToken({ userId: ids.parent1, role: 'parent' });

    const babies = await pool.query(
      `INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe)
       VALUES ($1, 'One', 'P0', '2025-01-01', 'M'),
              ($2, 'Two', 'P0', '2025-01-02', 'F') RETURNING id`,
      [ids.parent1, ids.parent2],
    );
    ids.bebe1 = babies.rows[0].id;
    ids.bebe2 = babies.rows[1].id;

    const session = await pool.query(
      `INSERT INTO session
       (centre_id, vaccin_id, date_session, heure_debut, heure_fin, statut, max_inscriptions)
       VALUES (1, 1, CURRENT_DATE + 10, '08:00', '12:00', 'EN_COURS', 5) RETURNING id`,
    );
    ids.foreignSession = session.rows[0].id;
    const rdv = await pool.query(
      `INSERT INTO rendez_vous (session_id, parent_id, bebe_id, statut)
       VALUES ($1, $2, $3, 'CONFIRME') RETURNING id`,
      [ids.foreignSession, ids.parent1, ids.bebe1],
    );
    ids.foreignRdv = rdv.rows[0].id;
  });

  afterAll(async () => {
    await pool.query(
      'DELETE FROM vaccination WHERE rendez_vous_id IN (SELECT id FROM rendez_vous WHERE parent_id IN ($1, $2))',
      [ids.parent1, ids.parent2],
    );
    await pool.query('DELETE FROM file_attente WHERE parent_id IN ($1, $2)', [
      ids.parent1,
      ids.parent2,
    ]);
    await pool.query("DELETE FROM flacon WHERE numero_lot = 'P0-LAST'");
    await pool.query('DELETE FROM rendez_vous WHERE parent_id IN ($1, $2)', [
      ids.parent1,
      ids.parent2,
    ]);
    for (const sessionId of [ids.bookingSession, ids.vaccinationSession, ids.foreignSession]) {
      if (sessionId) await pool.query('DELETE FROM session WHERE id = $1', [sessionId]);
    }
    if (ids.oneDoseVaccine)
      await pool.query('DELETE FROM vaccin WHERE id = $1', [ids.oneDoseVaccine]);
    await pool.query("DELETE FROM personnel WHERE cin = 'P0NURSE2'");
    await pool.query("DELETE FROM parent WHERE telephone IN ('0600000901', '0600000902')");
    await pool.query("DELETE FROM centre WHERE nom = 'P0 Centre 2'");
    await pool.end();
  });

  test.each([
    ['session', () => request(app).get('/api/sessions/' + ids.foreignSession)],
    ['appointment', () => request(app).get('/api/rendez-vous/' + ids.foreignRdv)],
    [
      'session vaccinations',
      () => request(app).get('/api/vaccinations/session/' + ids.foreignSession),
    ],
    ['session vials', () => request(app).get('/api/flacons/session/' + ids.foreignSession)],
    ['stock', () => request(app).get('/api/stock/centre/1')],
    ['delay alerts', () => request(app).get('/api/alertes-retard/centre/1')],
    [
      'absenteeism',
      () => request(app).get('/api/absenteisme/session/' + ids.foreignSession + '/absents'),
    ],
    ['stats', () => request(app).get('/api/stats/dashboard?centreId=1')],
  ])('nurse cannot read another centre through %s', async (_name, buildRequest) => {
    const response = await buildRequest().set('Authorization', 'Bearer ' + nurseToken);
    expect(response.status).toBe(403);
  });

  test('parent cannot read another parent appointment or child', async () => {
    const foreignRdv = await pool.query(
      `INSERT INTO rendez_vous (session_id, parent_id, bebe_id, statut)
       VALUES ($1, $2, $3, 'CONFIRME') RETURNING id`,
      [ids.foreignSession, ids.parent2, ids.bebe2],
    );
    const rdvResponse = await request(app)
      .get('/api/rendez-vous/' + foreignRdv.rows[0].id)
      .set('Authorization', 'Bearer ' + parentToken);
    const childResponse = await request(app)
      .get('/api/vaccinations/bebe/' + ids.bebe2)
      .set('Authorization', 'Bearer ' + parentToken);
    expect(rdvResponse.status).toBe(403);
    expect(childResponse.status).toBe(403);
  });

  test('only one concurrent booking gets the final place', async () => {
    const session = await pool.query(
      `INSERT INTO session
       (centre_id, vaccin_id, date_session, heure_debut, heure_fin, statut, max_inscriptions)
       VALUES (1, 1, CURRENT_DATE + 11, '08:00', '12:00', 'CONFIRMEE', 1) RETURNING id`,
    );
    ids.bookingSession = session.rows[0].id;
    const results = await Promise.allSettled([
      bookingService.book({
        parentId: ids.parent1,
        sessionId: session.rows[0].id,
        bebeId: ids.bebe1,
      }),
      bookingService.book({
        parentId: ids.parent2,
        sessionId: session.rows[0].id,
        bebeId: ids.bebe2,
      }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const count = await pool.query(
      "SELECT COUNT(*)::int AS total FROM rendez_vous WHERE session_id = $1 AND statut != 'ANNULE'",
      [session.rows[0].id],
    );
    expect(count.rows[0].total).toBe(1);
  });

  test('only one concurrent vaccination consumes the final vial dose', async () => {
    const vaccine = await pool.query(
      "INSERT INTO vaccin (nom, doses_par_flacon, age_cible_semaines, maladies_ciblees) VALUES ('P0 One Dose', 1, 0, 'Test') RETURNING id",
    );
    ids.oneDoseVaccine = vaccine.rows[0].id;
    const session = await pool.query(
      `INSERT INTO session
       (centre_id, vaccin_id, date_session, heure_debut, heure_fin, statut, max_inscriptions)
       VALUES (1, $1, CURRENT_DATE, '08:00', '12:00', 'EN_COURS', 2) RETURNING id`,
      [vaccine.rows[0].id],
    );
    ids.vaccinationSession = session.rows[0].id;
    const appointments = await pool.query(
      `INSERT INTO rendez_vous (session_id, parent_id, bebe_id, statut)
       VALUES ($1, $2, $3, 'CONFIRME'), ($1, $4, $5, 'CONFIRME') RETURNING id`,
      [session.rows[0].id, ids.parent1, ids.bebe1, ids.parent2, ids.bebe2],
    );
    const vial = await pool.query(
      `INSERT INTO flacon (vaccin_id, session_id, numero_lot, fabricant, date_ouverture)
       VALUES ($1, $2, 'P0-LAST', 'Test', NOW()) RETURNING id`,
      [vaccine.rows[0].id, session.rows[0].id],
    );
    const user = { id: 1, role: 'admin', centre_id: 1 };
    const results = await Promise.allSettled(
      appointments.rows.map((rdv) =>
        clinicalWorkflow.recordVaccination({
          user,
          rdvId: rdv.id,
          flaconId: vial.rows[0].id,
        }),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const finalVial = await pool.query('SELECT doses_utilisees FROM flacon WHERE id = $1', [
      vial.rows[0].id,
    ]);
    expect(finalVial.rows[0].doses_utilisees).toBe(1);
  });

  test('two concurrent nurses cannot call the same queue entry', async () => {
    const entry = await pool.query(
      `INSERT INTO file_attente
       (numero_attente, rendez_vous_id, centre_id, session_id, parent_id, bebe_id, statut)
       VALUES (9001, $1, $2, $3, $4, $5, 'EN_ATTENTE') RETURNING id`,
      [ids.foreignRdv, ids.centre2, ids.foreignSession, ids.parent1, ids.bebe1],
    );
    const results = await Promise.all([
      fileAttenteService.callNext(ids.centre2),
      fileAttenteService.callNext(ids.centre2),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter(Boolean)[0].id).toBe(entry.rows[0].id);
  });
});
