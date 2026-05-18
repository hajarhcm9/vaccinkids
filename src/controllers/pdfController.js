const catchAsync = require('../utils/catchAsync');
const PdfService = require('../services/pdfService');
const { pool } = require('../config/database');

const downloadVaccinationCertificate = catchAsync(async (req, res) => {
  const { vaccinationId } = req.params;
  const { rows } = await pool.query(
    "SELECT vac.id AS vaccination_id, vac.date_heure AS date_vaccination, vac.poids, vac.taille, vac.reactions, " +
    "b.prenom AS bebe_prenom, b.nom AS bebe_nom, b.date_naissance AS bebe_date_naissance, b.sexe AS bebe_sexe, " +
    "p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone AS parent_telephone, " +
    "v.nom AS vaccin_nom, f.numero_lot, " +
    "pers.nom AS infirmier_nom, pers.prenom AS infirmier_prenom, " +
    "c.nom AS centre_nom, c.adresse AS centre_adresse, c.telephone AS centre_telephone " +
    "FROM vaccination vac " +
    "JOIN rendezvous rdv ON rdv.id = vac.rendez_vous_id " +
    "JOIN bebe b ON b.id = rdv.bebe_id " +
    "JOIN parent p ON p.id = rdv.parent_id " +
    "JOIN session s ON s.id = rdv.session_id " +
    "JOIN vaccin v ON v.id = s.vaccin_id " +
    "LEFT JOIN flacon f ON f.id = vac.flacon_id " +
    "JOIN personnel pers ON pers.id = vac.personnel_id " +
    "JOIN centre c ON c.id = s.centre_id " +
    "WHERE vac.id = $1", [vaccinationId]
  );
  if (rows.length === 0) { const err = new Error('Vaccination non trouvee'); err.statusCode = 404; throw err; }
  const pdfBuffer = await PdfService.generateVaccinationCertificate(rows[0]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="attestation-' + rows[0].bebe_prenom + '.pdf"');
  res.send(pdfBuffer);
});

const downloadCarnet = catchAsync(async (req, res) => {
  const { bebeId } = req.params;
  const { rows: bebeRows } = await pool.query(
    "SELECT b.*, p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone AS parent_telephone FROM bebe b JOIN parent p ON p.id = b.parent_id WHERE b.id = $1", [bebeId]
  );
  if (bebeRows.length === 0) { const err = new Error('Bebe non trouve'); err.statusCode = 404; throw err; }
  const bebe = bebeRows[0];
  const { rows: vaccinations } = await pool.query(
    "SELECT vac.date_heure, vac.poids, vac.taille, vac.reactions, vc.nom AS vaccin_nom, f.numero_lot, pers.nom AS infirmier_nom, pers.prenom AS infirmier_prenom " +
    "FROM vaccination vac JOIN rendezvous rdv ON rdv.id = vac.rendez_vous_id JOIN session s ON s.id = rdv.session_id JOIN vaccin vc ON vc.id = s.vaccin_id LEFT JOIN flacon f ON f.id = vac.flacon_id JOIN personnel pers ON pers.id = vac.personnel_id WHERE rdv.bebe_id = $1 ORDER BY vac.date_heure DESC", [bebeId]
  );
  const { rows: retards } = await pool.query(
    "SELECT vc.nom AS vaccin_nom, vc.age_cible_semaines, (CURRENT_DATE - b.date_naissance) / 7 AS age_actuel_semaines FROM vaccin vc CROSS JOIN bebe b WHERE b.id = $1 AND vc.est_actif = TRUE AND NOT EXISTS (SELECT 1 FROM vaccination vac JOIN rendezvous rdv ON rdv.id = vac.rendez_vous_id JOIN session s ON s.id = rdv.session_id WHERE rdv.bebe_id = b.id AND s.vaccin_id = vc.id) AND (CURRENT_DATE - b.date_naissance) / 7 > vc.age_cible_semaines + 1 ORDER BY vc.age_cible_semaines", [bebeId]
  );
  const pdfBuffer = await PdfService.generateVaccinationCard({ ...bebe, vaccinations, retards });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="carnet-' + bebe.prenom + '.pdf"');
  res.send(pdfBuffer);
});

const downloadRdvConfirmation = catchAsync(async (req, res) => {
  const { rdvId } = req.params;
  const { rows } = await pool.query(
    "SELECT rdv.*, b.prenom AS bebe_prenom, b.nom AS bebe_nom, v.nom AS vaccin_nom, s.date_session, s.heure_debut, s.heure_fin, c.nom AS centre_nom, c.adresse AS centre_adresse " +
    "FROM rendezvous rdv JOIN bebe b ON b.id = rdv.bebe_id JOIN session s ON s.id = rdv.session_id JOIN vaccin v ON v.id = s.vaccin_id JOIN centre c ON c.id = s.centre_id WHERE rdv.id = $1", [rdvId]
  );
  if (rows.length === 0) { const err = new Error('Rendezvous-vous non trouve'); err.statusCode = 404; throw err; }
  const pdfBuffer = await PdfService.generateRdvConfirmation(rows[0]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="confirmation-rdv-' + rows[0].bebe_prenom + '.pdf"');
  res.send(pdfBuffer);
});

module.exports = { downloadVaccinationCertificate, downloadCarnet, downloadRdvConfirmation };
