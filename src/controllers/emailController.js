const catchAsync = require('../utils/catchAsync');
const EmailService = require('../services/emailService');
const PdfService = require('../services/pdfService');
const { success } = require('../utils/responseHandler');
const { pool } = require('../config/database');

const sendRdvConfirmation = catchAsync(async (req, res) => {
  const { rdvId } = req.params;

  const { rows } = await pool.query(
    "SELECT rdv.*, b.prenom AS bebe_prenom, b.nom AS bebe_nom, " +
    "p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone AS parent_telephone, p.email AS parent_email, " +
    "v.nom AS vaccin_nom, s.date_session, s.heure_debut, s.heure_fin, " +
    "c.nom AS centre_nom, c.adresse AS centre_adresse " +
    "FROM rendezvous rdv " +
    "JOIN bebe b ON b.id = rdv.bebe_id " +
    "JOIN parent p ON p.id = rdv.parent_id " +
    "JOIN session s ON s.id = rdv.session_id " +
    "JOIN vaccin v ON v.id = s.vaccin_id " +
    "JOIN centre c ON c.id = s.centre_id " +
    "WHERE rdv.id = $1",
    [rdvId],
  );

  if (rows.length === 0) {
    const err = new Error('Rendevous-vous non trouve');
    err.statusCode = 404;
    throw err;
  }

  const rdv = rows[0];
  if (!rdv.parent_email) {
    const err = new Error('Aucune adresse email associee a ce parent');
    err.statusCode = 400;
    throw err;
  }

  const result = await EmailService.sendAppointmentConfirmation(rdv.parent_email, {
    parentNom: rdv.parent_prenom + ' ' + rdv.parent_nom,
    bebePrenom: rdv.bebe_prenom,
    bebeNom: rdv.bebe_nom,
    vaccinNom: rdv.vaccin_nom,
    dateSession: new Date(rdv.date_session).toLocaleDateString('fr-FR', { dateStyle: 'long' }),
    heureDebut: rdv.heure_debut,
    heureFin: rdv.heure_fin,
    centreNom: rdv.centre_nom,
  });

  success(res, 200, 'Email de confirmation envoye', result);
});

const sendRdvReminder = catchAsync(async (req, res) => {
  const { rdvId } = req.params;

  const { rows } = await pool.query(
    "SELECT rdv.*, b.prenom AS bebe_prenom, b.nom AS bebe_nom, " +
    "p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone AS parent_telephone, p.email AS parent_email, " +
    "v.nom AS vaccin_nom, s.date_session, s.heure_debut, s.heure_fin, " +
    "c.nom AS centre_nom, c.adresse AS centre_adresse " +
    "FROM rendevous rdv " +
    "JOIN bebe b ON b.id = rdv.bebe_id " +
    "JOIN parent p ON p.id = rdv.parent_id " +
    "JOIN session s ON s.id = rdv.session_id " +
    "JOIN vaccin v ON v.id = s.vaccin_id " +
    "JOIN centre c ON c.id = s.centre_id " +
    "WHERE rdv.id = $1",
    [rdvId],
  );

  if (rows.length === 0) {
    const err = new Error('Rendevous-vous non trouve');
    err.statusCode = 404;
    throw err;
  }

  const rdv = rows[0];
  if (!rdv.parent_email) {
    const err = new Error('Aucune adresse email associee a ce parent');
    err.statusCode = 400;
    throw err;
  }

  const result = await EmailService.sendAppointmentReminder(rdv.parent_email, {
    parentNom: rdv.parent_prenom + ' ' + rdv.parent_nom,
    bebePrenom: rdv.bebe_prenom,
    bebeNom: rdv.bebe_nom,
    vaccinNom: rdv.vaccin_nom,
    dateSession: new Date(rdv.date_session).toLocaleDateString('fr-FR', { dateStyle: 'long' }),
    heureDebut: rdv.heure_debut,
    heureFin: rdv.heure_fin,
    centreNom: rdv.centre_nom,
  });

  success(res, 200, 'Email de rappel envoye', result);
});

const sendVaccinationCertificate = catchAsync(async (req, res) => {
  const { vaccinationId } = req.params;

  const { rows } = await pool.query(
    "SELECT vac.id AS vaccination_id, vac.date_heure AS date_vaccination, vac.poids, vac.taille, vac.reactions, " +
    "b.prenom AS bebe_prenom, b.nom AS bebe_nom, b.date_naissance AS bebe_date_naissance, b.sexe AS bebe_sexe, " +
    "p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone AS parent_telephone, p.email AS parent_email, " +
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
    "WHERE vac.id = $1",
    [vaccinationId],
  );

  if (rows.length === 0) {
    const err = new Error('Vaccination non trouvee');
    err.statusCode = 404;
    throw err;
  }

  const vac = rows[0];
  if (!vac.parent_email) {
    const err = new Error('Aucune adresse email associee a ce parent');
    err.statusCode = 400;
    throw err;
  }

  const pdfBuffer = await PdfService.generateVaccinationCertificate(vac);

  const result = await EmailService.sendVaccinationCertificate(vac.parent_email, {
    parentNom: vac.parent_prenom + ' ' + vac.parent_nom,
    bebePrenom: vac.bebe_prenom,
    bebeNom: vac.bebe_nom,
    vaccinNom: vac.vaccin_nom,
    dateVaccination: new Date(vac.date_vaccination).toLocaleDateString('fr-FR', { dateStyle: 'long' }),
    centreNom: vac.centre_nom,
    infirmierNom: vac.infirmier_prenom + ' ' + vac.infirmier_nom,
  }, pdfBuffer);

  success(res, 200, 'Certificat de vaccination envoye par email', result);
});

module.exports = {
  sendRdvConfirmation,
  sendRdvReminder,
  sendVaccinationCertificate,
};
