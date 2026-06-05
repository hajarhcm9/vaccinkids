const PdfService = require('../services/pdfService');
const { pool } = require('../config/database');
const { notFound, error } = require('../utils/responseHandler');
const authorization = require('../services/resourceAuthorizationService');

var pdfController = {
  downloadVaccinationCertificate: async function (req, res, next) {
    try {
      var vaccinationId = req.params.vaccinationId;
      await authorization.assertVaccinationAccess(req.user, vaccinationId);
      var result = await pool.query(
        'SELECT v.id, v.poids, v.taille, v.date_heure as date_vaccination, ' +
          'b.prenom as bebe_prenom, b.nom as bebe_nom, b.date_naissance, ' +
          'vac.nom as vaccin_nom, ' +
          'f.numero_lot, ' +
          'p.prenom as infirmier_prenom, p.nom as infirmier_nom, ' +
          'c.nom as centre_nom, ' +
          'par.prenom as parent_prenom, par.nom as parent_nom, par.telephone as parent_telephone ' +
          'FROM vaccination v ' +
          'JOIN rendez_vous rv ON v.rendez_vous_id = rv.id ' +
          'JOIN bebe b ON rv.bebe_id = b.id ' +
          'JOIN parent par ON rv.parent_id = par.id ' +
          'JOIN session s ON rv.session_id = s.id ' +
          'JOIN vaccin vac ON s.vaccin_id = vac.id ' +
          'JOIN centre c ON s.centre_id = c.id ' +
          'LEFT JOIN flacon f ON v.flacon_id = f.id ' +
          'LEFT JOIN personnel p ON v.personnel_id = p.id ' +
          'WHERE v.id = $1',
        [vaccinationId],
      );
      if (result.rows.length === 0) {
        return notFound(res, 'Vaccination non trouvee');
      }
      var data = result.rows[0];
      var pdfBuffer = await PdfService.generateVaccinationCertificate(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="attestation-vaccination-' +
          data.bebe_prenom +
          '-' +
          data.bebe_nom +
          '.pdf"',
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } catch (err) {
      if (err.statusCode) return next(err);
      console.error('Error generating vaccination certificate PDF:', err);
      return error(res, 'Erreur lors de la generation du PDF');
    }
  },

  downloadCarnet: async function (req, res, next) {
    try {
      var bebeId = req.params.bebeId;
      await authorization.assertBebeAccess(req.user, bebeId);
      var bebeResult = await pool.query(
        'SELECT b.id, b.prenom as bebe_prenom, b.nom as bebe_nom, b.date_naissance, b.sexe, b.code_qr, ' +
          'par.prenom as parent_prenom, par.nom as parent_nom, par.telephone as parent_telephone ' +
          'FROM bebe b ' +
          'JOIN parent par ON b.parent_id = par.id ' +
          'WHERE b.id = $1',
        [bebeId],
      );
      if (bebeResult.rows.length === 0) {
        return notFound(res, 'Bebe non trouve');
      }
      var bebe = bebeResult.rows[0];
      var vaccResult = await pool.query(
        'SELECT vac.nom as vaccin_nom, v.date_heure, ' +
          'f.numero_lot, ' +
          'p.prenom as infirmier_prenom, p.nom as infirmier_nom ' +
          'FROM vaccination v ' +
          'JOIN rendez_vous rv ON v.rendez_vous_id = rv.id ' +
          'JOIN session s ON rv.session_id = s.id ' +
          'JOIN vaccin vac ON s.vaccin_id = vac.id ' +
          'LEFT JOIN flacon f ON v.flacon_id = f.id ' +
          'LEFT JOIN personnel p ON v.personnel_id = p.id ' +
          'WHERE rv.bebe_id = $1 ' +
          'ORDER BY v.date_heure',
        [bebeId],
      );
      var data = Object.assign({}, bebe, {
        vaccinations: vaccResult.rows,
        retards: [],
      });
      var pdfBuffer = await PdfService.generateVaccinationCard(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="carnet-' + bebe.bebe_prenom + '-' + bebe.bebe_nom + '.pdf"',
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } catch (err) {
      if (err.statusCode) return next(err);
      console.error('Error generating carnet PDF:', err);
      return error(res, 'Erreur lors de la generation du carnet');
    }
  },

  downloadRdvConfirmation: async function (req, res, next) {
    try {
      var rdvId = req.params.rdvId;
      await authorization.assertRendezVousAccess(req.user, rdvId);
      var result = await pool.query(
        'SELECT b.prenom as bebe_prenom, b.nom as bebe_nom, ' +
          'vac.nom as vaccin_nom, ' +
          's.date_session, s.heure_debut, s.heure_fin, ' +
          'c.nom as centre_nom, c.adresse as centre_adresse, ' +
          'par.prenom as parent_prenom, par.nom as parent_nom, par.telephone as parent_telephone ' +
          'FROM rendez_vous rv ' +
          'JOIN bebe b ON rv.bebe_id = b.id ' +
          'JOIN parent par ON rv.parent_id = par.id ' +
          'JOIN session s ON rv.session_id = s.id ' +
          'JOIN vaccin vac ON s.vaccin_id = vac.id ' +
          'JOIN centre c ON s.centre_id = c.id ' +
          'WHERE rv.id = $1',
        [rdvId],
      );
      if (result.rows.length === 0) {
        return notFound(res, 'Rendez-vous non trouve');
      }
      var data = result.rows[0];
      var pdfBuffer = await PdfService.generateRdvConfirmation(data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="confirmation-rdv-' +
          data.bebe_prenom +
          '-' +
          data.bebe_nom +
          '.pdf"',
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } catch (err) {
      if (err.statusCode) return next(err);
      console.error('Error generating RDV confirmation PDF:', err);
      return error(res, 'Erreur lors de la generation du PDF');
    }
  },
};

module.exports = pdfController;
