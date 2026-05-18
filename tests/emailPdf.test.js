const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const EmailService = require('../src/services/emailService');
const PdfService = require('../src/services/pdfService');

describe('Email & PDF (Day 16)', () => {
  let adminToken, nurseToken, testParentId, testBebeId, testSessionId, testRdvId, testVaccinationId;

  beforeAll(async () => {
    const adminRes = await request(app).post('/api/auth/personnel/login').send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });
    adminToken = adminRes.body.data.accessToken;
    const nurseRes = await request(app).post('/api/auth/personnel/login').send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });
    nurseToken = nurseRes.body.data.accessToken;

    const pr = await pool.query("INSERT INTO parent (telephone, nom, prenom, langue_preferee, email) VALUES ('+212600000099', 'TestEmail', 'ParentEmail', 'fr', 'test.email@vaccinikids.ma') RETURNING id");
                          [0                          [0                         be                           [0    iss                          [0                      NI                          [0                          [0    ',                          [0                          [0wait pool.query("INSERT INTO session (centr                          [0                          [0                         be                ENT                        ',                          [0IRMEE') RETURNING id");
    testSessionId = sr.rows[0].id;
    const rr = await pool.query('INSER    const rr = await pool.query('INSER    const_i    const rr = await pool.query('INSER    const rr = await pool.query('INSER    const_i    const rr = await pool.query('INSER    .rows[0].id;
    const vsr = await pool.query("INSE    const vsr = await pool.query("INSE    const vsr = await pool.query("INSE    const vsr = await pool.query("INSE    const vsr = await pool.query("INSE    const vsr = await pool.query("INSE    const const vacSessionId = vsr.rows[0].id;
    const vrr = await pool.query('INSERT INTO rendez_vous (session_id, parent_id, bebe_id, statut) VALUES ($1, $2, $3, 'PRESENT') RETURNING id', [vacSessionId, testParentId, testBebeId]);
    const vacRdvId = vrr.rows[0].id;
    const vr = await pool.query('INSERT INTO vaccination (rendez_vous_id, personnel_id, poids, taille) VALUES ($1, 2, 5.5, 62) RETURNING id', [vacRdvId]);
    testVaccinationId = vr.rows[0].id;
  });

  afterAll(async () => {
    try {
      awai      awai      awai      awai   tion WHERE rendez_vous_id IN (SELECT id FROM rendez_vous WHERE parent_id = $1)', [testParentId]);
      await pool.query('DELETE FROM rendez_vous WHERE parent_id = $1', [testParentId]);
      await pool.query("DELETE FROM sessio      await pool.query("DELETE FROM sessio      await pool.query("DELETE FROM sessio      await pool.query("DELETE FROM sessio      await pool.query("DELETE FROM sessio      await pool.query("DELETE FROM sessio      await pool.qury('DELETE FROM parent WHERE id = $1', [testPa      await pool.query("DELETE FROM sessio      await pool.query("DELETE FROM sessio      await pool.query("DELETE FROM sessio      await pool.query("DELETE FROM sessio      await pool.queritialized).toBe(true);
    });
    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    it('    i>Test</p>' });
      expect(result.success).toBe(true      expexpect(result.me   geId).t      expect(result.success).toBe(true      expexpect(result.me   geId).t      expect(result.success).toBe(true      expexpect(result.me   gject: 'Test', html: '<p>Test</p>' })).rejects.toThrow('Email recipient (to) is required');
      expect(result.success).toBe(true      expexpect(result.me   geId).t      expect(result.success).toBe(true      expexpect(result.me   geId).t      expect(result.success).toBe(true      expexpect(result.me   gject: 'Test', html: '<p>Test</p>' })).rejects.toThrow('Email recipient (to) is required');
om: 'Centre' });
      expect(result.success).toBe(true);
    });
    it('should send appointment reminder', async () => {
      const result = await EmailService.sendAppointmentReminder('test@example.com', { parentNom: 'Jean', bebePren     Bebe', bebeNom: 'Test', vaccinNom: 'BCG', dateSession: '15 juin', heureDebut: '09:00', heureFin: '12:00', centreNom: 'Centre' });
      expect(result.success).toBe(true);
                                                                                                                                                                                                                                                                                                                  om                                                                                                                                                                                                                                                                                                              est', parent_teleph                                       , date_vac                                                       5,                                                                                                                                                                                                                                                    it PdfService.generateVaccinationCertificate(mockData);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);
      expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
    });
    it('should generate vaccination card PDF', async () => {
      const buffer = await PdfService.generateVaccinationCard({ bebe_prenom: 'Bebe', bebe_nom: 'Test', date_naissance: '2024-01-15', sexe: 'M', code_qr: 'VK-TEST', parent_prenom: 'Parent', parent_nom: 'Test', parent_telephone: '+212600000001', vaccinations: [{ vaccin_nom: 'BCG', date_heure: '2025-01-15', numero_lot: 'LOT123', infirmier_prenom: 'Inf', infirmier_nom: 'Test' }], retards: [] });
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
    });
    it('should generate RDV confirmation PDF', async () => {
      const buffer = await PdfService.generateRdvConfirmation({ bebe_prenom: 'Bebe', bebe_nom: 'Test', vaccin_nom: 'BCG', date_session: '2025-06-15', heure_debut: '09:00', heure_fin: '12:00', centre_nom: 'Centr      cone_      const buffer = await PdfService.generateRdfer(buffer)).toBe(true);
      expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
    });
    it('should generate car    it('should generate car    it('should generate car    iuf    it('should generate car    it('should generate car    it('should generate car    iuf    it('should generate car    it('should generate car    it('should generate car    iuf    it('should generate car    it('should generate car    it('should generate car    iuf    it('should generate car    it('should generate car    it('should generate car    iuf    it('should generate car    it('should      it('should generate car    it('should gener ()    it('should generate car    it('should generate car    ls/rdv-confirmation/' + testRdvId).set('Authorization', 'Bearer ' + adminToken);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.success).toBe(true);
    });
    it('should send RDV reminder email', async () => {
      const res = await request(app).post('/api/emails/rdv-rappel/' + testRdvId).set('Authorization', 'Bearer ' + adminToken);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.success).toBe(true);
    });
    it('should send vaccination certificate email', async () => {
      const res = await request(app).post('/api/emails/vaccination-certificate/' + testVaccinationId).set('Authorization', 'Bearer ' + adminToken);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.success).toBe(true);
    });
    it('should deny unauthenticated access', async () => {
      const res = await request(app).post('/api/emails/rdv-confirmation/' + testRdvId);
      expect(res.statusCode).toBe(401);
    });
    it('should return 404 for non-existent RDV', async () => {
      const res = await request(app).post('/api/emails/rdv-confirmation/99999').se      const res = await request(appnToke      const res = await request(app).post('/ap          it('should return 404 for non-existent vaccination', async () => {
      const res = await request(app).post('/api/emails/vaccination-certificate/99999').set('Authorization', 'Bearer ' + adminToken);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/pdf', () => {
    it('should download vaccination certificate PDF', async () => {
      const res = await request(app).get('/api/pdf/vaccination-certificate/' + testVaccinationId).set('Authorization', 'Bearer ' + adminToken);
      expect(res.statusCode).t      expect(res.statusCode).t      expect(respe      Be('application/pdf');
      expect(res.headers['content-disposition']).toContain('attestation');
    });
    it('should download carnet PDF', async     it('should download carnett request(app).get    it('should download carnet PDF', async     it('should dowr     it('should download carnet PDF', async     it('should download carnett request(app).get    it('should download carnet PDF', async     it('should dowr     it('should download carnet PDF', async     it('should download carnett request(app).g/r    it('should download carnet PDF', async     it('should download carnett request(app).get    it('should.toBe(200);
      expect(res      expect(res     e']).toBe('application/pdf' ;
    });
    it('should deny unauthentic    it('should deny unauthentic    it('should deny unauthentic    et    it('should deny unauthentic    it('should deny unauthentic    it('should deny unau).toBe(401);
    });
    it('should return 404 for non-exi    it('should return 404 for non-exi    it('should return 404 for non-exi    it('should return 404 for nif    it('should ret'Authorization', 'Bearer ' + adminToken);
      expect(re      usCode).toBe(404);
    });
    it('should return 404 for non-existent bebe carnet', async () => {
      const res = await request(app).get('/api/pdf/carnet/99999').set('Authorization', 'Bearer ' + adminToken);
      expect(res.statusCode).toBe(404);
    });
  });
});
