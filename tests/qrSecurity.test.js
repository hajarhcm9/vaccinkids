const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const { createQrCode, isValidQrCode } = require('../src/utils/qrCode');

let nurseToken;
let eligibleQr;
let outOfScopeQr;

const findScanAudit = async (qrCode) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await pool.query(
      `SELECT * FROM audit_log
       WHERE action = 'READ'
         AND user_role = 'infirmier'
         AND new_values->>'path' = $1
       ORDER BY id DESC LIMIT 1`,
      [`/api/carnet/qr/${qrCode}`],
    );
    if (result.rows[0]) return result.rows[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
};

beforeAll(async () => {
  const login = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
  nurseToken = login.body.data.tokens.accessToken;

  const parent = await pool.query(
    `INSERT INTO parent (telephone, nom, prenom)
     VALUES ('+212600009991', 'QR', 'Parent') RETURNING id`,
  );
  const otherCentre = await pool.query(
    `INSERT INTO centre (nom, adresse, telephone)
     VALUES ('QR Other Centre', 'Test', '+212600009992') RETURNING id`,
  );

  eligibleQr = createQrCode();
  outOfScopeQr = createQrCode();
  const babies = await pool.query(
    `INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe, code_qr)
     VALUES ($1, 'Eligible', 'QR', CURRENT_DATE - 100, 'F', $2),
            ($1, 'Other', 'QR', CURRENT_DATE - 100, 'M', $3)
     RETURNING id`,
    [parent.rows[0].id, eligibleQr, outOfScopeQr],
  );
  const sessions = await pool.query(
    `INSERT INTO session
       (centre_id, vaccin_id, date_session, heure_debut, heure_fin, statut, max_inscriptions)
     VALUES (1, 1, CURRENT_DATE, '08:00', '12:00', 'EN_COURS', 20),
            ($1, 1, CURRENT_DATE, '08:00', '12:00', 'EN_COURS', 20)
     RETURNING id`,
    [otherCentre.rows[0].id],
  );
  await pool.query(
    `INSERT INTO rendez_vous (session_id, parent_id, bebe_id, statut)
     VALUES ($1, $3, $4, 'CONFIRME'), ($2, $3, $5, 'CONFIRME')`,
    [
      sessions.rows[0].id,
      sessions.rows[1].id,
      parent.rows[0].id,
      babies.rows[0].id,
      babies.rows[1].id,
    ],
  );
});

afterAll(() => pool.end());

describe('Secure QR carnet access', () => {
  test('generates unpredictable versioned QR codes', () => {
    const first = createQrCode();
    const second = createQrCode();
    expect(isValidQrCode(first)).toBe(true);
    expect(second).not.toBe(first);
  });

  test('rejects obsolete QR formats', async () => {
    const response = await request(app)
      .get('/api/carnet/qr/VK-OLD-CODE')
      .set('Authorization', `Bearer ${nurseToken}`);
    expect(response.status).toBe(400);
  });

  test('allows a nurse to scan an eligible appointment at their centre', async () => {
    const response = await request(app)
      .get(`/api/carnet/qr/${eligibleQr}`)
      .set('Authorization', `Bearer ${nurseToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.eligibleAppointments).toHaveLength(1);
    const audit = await findScanAudit(eligibleQr);
    expect(audit).toMatchObject({ table_name: 'bebe', action: 'READ', user_role: 'infirmier' });
    expect(audit.request_id).toBe(response.headers['x-request-id']);
  });

  test('rejects a baby outside the nurse centre scope', async () => {
    const response = await request(app)
      .get(`/api/carnet/qr/${outOfScopeQr}`)
      .set('Authorization', `Bearer ${nurseToken}`);
    expect(response.status).toBe(403);
  });
});
