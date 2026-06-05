const EmailService = require('../services/emailService');
const { pool } = require('../config/database');
const { success, notFound, error } = require('../utils/responseHandler');
const authorization = require('../services/resourceAuthorizationService');

var emailController = {
  sendRdvConfirmation: async function (req, res, next) {
    try {
      var rdvId = req.params.rdvId;
      await authorization.assertRendezVousAccess(req.user, rdvId);
      var result = await pool.query(
        'SELECT par.email, par.prenom as parent_prenom, par.nom as parent_nom, ' +
          'b.prenom as bebe_prenom, b.nom as bebe_nom, ' +
          'vac.nom as vaccin_nom, ' +
          's.date_session, s.heure_debut, s.heure_fin, ' +
          'c.nom as centre_nom ' +
          'FROM rendez_vous rv ' +
          'JOIN parent par ON rv.parent_id = par.id ' +
          'JOIN bebe b ON rv.bebe_id = b.id ' +
          'JOIN session s ON rv.session_id = s.id ' +
          'JOIN vaccin vac ON s.vaccin_id = vac.id ' +
          'JOIN centre c ON s.centre_id = c.id ' +
          'WHERE rv.id = $1',
        [rdvId],
      );
      if (result.rows.length === 0) {
        return notFound(res, 'Rendez-vous non trouve');
      }
      var row = result.rows[0];
      if (!row.email) {
        return error(res, "Le parent n'a pas d'adresse email enregistree", 400);
      }
      var emailResult = await EmailService.sendAppointmentConfirmation(row.email, {
        parentNom: row.parent_prenom,
        bebePrenom: row.bebe_prenom,
        bebeNom: row.bebe_nom,
        vaccinNom: row.vaccin_nom,
        dateSession: row.date_session ? new Date(row.date_session).toLocaleDateString('fr-FR') : '',
        heureDebut: row.heure_debut ? row.heure_debut.substring(0, 5) : '',
        heureFin: row.heure_fin ? row.heure_fin.substring(0, 5) : '',
        centreNom: row.centre_nom,
      });
      return success(res, 200, 'Email de confirmation envoye', emailResult);
    } catch (err) {
      if (err.statusCode) return next(err);
      console.error('Error sending RDV confirmation email:', err);
      return error(res, "Erreur lors de l'envoi de l'email");
    }
  },

  sendRdvReminder: async function (req, res, next) {
    try {
      var rdvId = req.params.rdvId;
      await authorization.assertRendezVousAccess(req.user, rdvId);
      var result = await pool.query(
        'SELECT par.email, par.prenom as parent_prenom, par.nom as parent_nom, ' +
          'b.prenom as bebe_prenom, b.nom as bebe_nom, ' +
          'vac.nom as vaccin_nom, ' +
          's.date_session, s.heure_debut, s.heure_fin, ' +
          'c.nom as centre_nom ' +
          'FROM rendez_vous rv ' +
          'JOIN parent par ON rv.parent_id = par.id ' +
          'JOIN bebe b ON rv.bebe_id = b.id ' +
          'JOIN session s ON rv.session_id = s.id ' +
          'JOIN vaccin vac ON s.vaccin_id = vac.id ' +
          'JOIN centre c ON s.centre_id = c.id ' +
          'WHERE rv.id = $1',
        [rdvId],
      );
      if (result.rows.length === 0) {
        return notFound(res, 'Rendez-vous non trouve');
      }
      var row = result.rows[0];
      if (!row.email) {
        return error(res, "Le parent n'a pas d'adresse email enregistree", 400);
      }
      var emailResult = await EmailService.sendAppointmentReminder(row.email, {
        parentNom: row.parent_prenom,
        bebePrenom: row.bebe_prenom,
        bebeNom: row.bebe_nom,
        vaccinNom: row.vaccin_nom,
        dateSession: row.date_session ? new Date(row.date_session).toLocaleDateString('fr-FR') : '',
        heureDebut: row.heure_debut ? row.heure_debut.substring(0, 5) : '',
        heureFin: row.heure_fin ? row.heure_fin.substring(0, 5) : '',
        centreNom: row.centre_nom,
      });
      return success(res, 200, 'Email de rappel envoye', emailResult);
    } catch (err) {
      if (err.statusCode) return next(err);
      console.error('Error sending RDV reminder email:', err);
      return error(res, "Erreur lors de l'envoi de l'email");
    }
  },

  sendVaccinationCertificate: async function (req, res, next) {
    try {
      var vaccinationId = req.params.vaccinationId;
      await authorization.assertVaccinationAccess(req.user, vaccinationId);
      var result = await pool.query(
        'SELECT par.email, par.prenom as parent_prenom, par.nom as parent_nom, ' +
          'b.prenom as bebe_prenom, b.nom as bebe_nom, ' +
          'vac.nom as vaccin_nom, ' +
          'v.date_heure as date_vaccination, ' +
          'p.prenom as infirmier_prenom, p.nom as infirmier_nom, ' +
          'c.nom as centre_nom, ' +
          'v.poids, v.taille ' +
          'FROM vaccination v ' +
          'JOIN rendez_vous rv ON v.rendez_vous_id = rv.id ' +
          'JOIN parent par ON rv.parent_id = par.id ' +
          'JOIN bebe b ON rv.bebe_id = b.id ' +
          'JOIN session s ON rv.session_id = s.id ' +
          'JOIN vaccin vac ON s.vaccin_id = vac.id ' +
          'JOIN centre c ON s.centre_id = c.id ' +
          'LEFT JOIN personnel p ON v.personnel_id = p.id ' +
          'WHERE v.id = $1',
        [vaccinationId],
      );
      if (result.rows.length === 0) {
        return notFound(res, 'Vaccination non trouvee');
      }
      var row = result.rows[0];
      if (!row.email) {
        return error(res, "Le parent n'a pas d'adresse email enregistree", 400);
      }
      var emailResult = await EmailService.sendVaccinationCertificate(row.email, {
        parentNom: row.parent_prenom,
        bebePrenom: row.bebe_prenom,
        bebeNom: row.bebe_nom,
        vaccinNom: row.vaccin_nom,
        dateVaccination: row.date_vaccination
          ? new Date(row.date_vaccination).toLocaleDateString('fr-FR')
          : '',
        infirmierPrenom: row.infirmier_prenom || '',
        infirmierNom: row.infirmier_nom || '',
        centreNom: row.centre_nom,
        poids: row.poids,
        taille: row.taille,
      });
      return success(res, 200, "Email d'attestation envoye", emailResult);
    } catch (err) {
      if (err.statusCode) return next(err);
      console.error('Error sending vaccination certificate email:', err);
      return error(res, "Erreur lors de l'envoi de l'email");
    }
  },
};

module.exports = emailController;
