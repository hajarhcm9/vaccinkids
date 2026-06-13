const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const TokenService = require('../src/services/tokenService');

describe('Code-complete admin to clinical E2E', () => {
  const ids = {};
  let adminToken;
  let nurseToken;
  let parentToken;

  beforeAll(async () => {
    const centre = await pool.query(
      `INSERT INTO centre (nom, adresse, telephone)
       VALUES ('E2E Code Centre', 'E2E Address', '+212500009999') RETURNING id`,
    );
    ids.centre = centre.rows[0].id;
    const vaccine = await pool.query(
      `INSERT INTO vaccin (nom, doses_par_flacon, age_cible_semaines, maladies_ciblees)
       VALUES ('E2E Code Vaccine', 2, 0, 'E2E') RETURNING id`,
    );
    ids.vaccine = vaccine.rows[0].id;
    const staff = await pool.query(
      `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id)
       VALUES ('E2EADMIN', 'E2E', 'Admin', 'unused', 'admin', $1),
              ('E2ENURSE', 'E2E', 'Nurse', 'unused', 'infirmier', $1)
       RETURNING id, role`,
      [ids.centre],
    );
    ids.admin = staff.rows.find((entry) => entry.role === 'admin').id;
    ids.nurse = staff.rows.find((entry) => entry.role === 'infirmier').id;
    const parent = await pool.query(
      `INSERT INTO parent (telephone, nom, prenom)
       VALUES ('0600999901', 'E2E', 'Parent') RETURNING id`,
    );
    ids.parent = parent.rows[0].id;
    const baby = await pool.query(
      `INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe)
       VALUES ($1, 'E2E', 'Baby', '2025-01-01', 'F') RETURNING id`,
      [ids.parent],
    );
    ids.baby = baby.rows[0].id;
    const stock = await pool.query(
      `INSERT INTO stock (centre_id, vaccin_id, quantite_disponible, seuil_alerte)
       VALUES ($1, $2, 2, 1) RETURNING id`,
      [ids.centre, ids.vaccine],
    );
    ids.stock = stock.rows[0].id;

    adminToken = TokenService.generateAccessToken({ userId: ids.admin, role: 'admin' });
    nurseToken = TokenService.generateAccessToken({ userId: ids.nurse, role: 'infirmier' });
    parentToken = TokenService.generateAccessToken({ userId: ids.parent, role: 'parent' });
  });

  afterAll(async () => {
    if (ids.appointment)
      await pool.query('DELETE FROM vaccination WHERE rendez_vous_id = $1', [ids.appointment]);
    if (ids.vial) await pool.query('DELETE FROM flacon WHERE id = $1', [ids.vial]);
    if (ids.appointment) await pool.query('DELETE FROM rendez_vous WHERE id = $1', [ids.appointment]);
    if (ids.session) await pool.query('DELETE FROM session WHERE id = $1', [ids.session]);
    await pool.query('DELETE FROM stock_movement WHERE stock_id = $1', [ids.stock]);
    await pool.query('DELETE FROM stock WHERE id = $1', [ids.stock]);
    await pool.query('DELETE FROM bebe WHERE id = $1', [ids.baby]);
    await pool.query('DELETE FROM parent WHERE id = $1', [ids.parent]);
    await pool.query('DELETE FROM personnel WHERE id IN ($1, $2)', [ids.admin, ids.nurse]);
    await pool.query('DELETE FROM vaccin WHERE id = $1', [ids.vaccine]);
    await pool.query('DELETE FROM centre WHERE id = $1', [ids.centre]);
    await pool.end();
  });

  test('persists the complete server-confirmed workflow and rejects duplicate vaccination', async () => {
    const sessionResponse = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        centre_id: ids.centre,
        vaccin_id: ids.vaccine,
        date_session: new Date().toISOString().slice(0, 10),
        heure_debut: '08:00',
        heure_fin: '12:00',
        max_inscriptions: 5,
      });
    expect(sessionResponse.status).toBe(201);
    ids.session = sessionResponse.body.data.id;

    const appointmentResponse = await request(app)
      .post('/api/rendez-vous')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ session_id: ids.session, bebe_id: ids.baby });
    expect(appointmentResponse.status).toBe(201);
    ids.appointment = appointmentResponse.body.data.id;

    const confirmAppointment = await request(app)
      .patch(`/api/rendez-vous/${ids.appointment}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'CONFIRME' });
    expect(confirmAppointment.status).toBe(200);

    const confirmSession = await request(app)
      .patch(`/api/sessions/${ids.session}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(confirmSession.status).toBe(200);

    const startSession = await request(app)
      .patch(`/api/sessions/${ids.session}/start`)
      .set('Authorization', `Bearer ${nurseToken}`);
    expect(startSession.status).toBe(200);

    const vialResponse = await request(app)
      .post('/api/flacons')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        vaccin_id: ids.vaccine,
        session_id: ids.session,
        numero_lot: 'E2E-CODE-LOT',
        fabricant: 'E2E Pharma',
      });
    expect(vialResponse.status).toBe(201);
    ids.vial = vialResponse.body.data.id;

    const stockAfterOpen = await pool.query(
      'SELECT quantite_disponible FROM stock WHERE id = $1',
      [ids.stock],
    );
    expect(stockAfterOpen.rows[0].quantite_disponible).toBe(1);
    const movement = await pool.query(
      "SELECT type FROM stock_movement WHERE stock_id = $1 AND type = 'VIAL_OPEN'",
      [ids.stock],
    );
    expect(movement.rows).toHaveLength(1);

    const vaccinationResponse = await request(app)
      .post(`/api/vaccinations/${ids.appointment}`)
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({ flacon_id: ids.vial, poids: 8.2, taille: 70, reactions: 'Aucune' });
    expect(vaccinationResponse.status).toBe(201);

    const duplicateResponse = await request(app)
      .post(`/api/vaccinations/${ids.appointment}`)
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({ flacon_id: ids.vial, poids: 8.2, taille: 70, reactions: 'Aucune' });
    expect(duplicateResponse.status).toBe(409);

    const persisted = await pool.query(
      `SELECT rdv.statut, f.doses_utilisees,
              EXISTS (
                SELECT 1 FROM audit_log a
                WHERE a.table_name = 'vaccination'
                  AND a.record_id = vac.id
                  AND a.action = 'INSERT'
              ) AS audited
       FROM rendez_vous rdv
       JOIN vaccination vac ON vac.rendez_vous_id = rdv.id
       JOIN flacon f ON f.id = vac.flacon_id
       WHERE rdv.id = $1`,
      [ids.appointment],
    );
    expect(persisted.rows[0]).toMatchObject({
      statut: 'PRESENT',
      doses_utilisees: 1,
      audited: true,
    });
  });
});
