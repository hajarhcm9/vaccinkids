const Vaccination = require('../models/Vaccination');
const RendezVous = require('../models/RendezVous');
const Flacon = require('../models/Flacon');
const Session = require('../models/Session');
const Vaccin = require('../models/Vaccin');
const Bebe = require('../models/Bebe');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');

const VaccinationController = {
  record: catchAsync(async (req, res, next) => {
    const { rdvId } = req.params;
    const { flacon_id, poids, taille, reactions } = req.body;
    const personnelId = req.user.id;

    const rdv = await RendezVous.findById(rdvId);
    if (!rdv) return next(ApiError.notFound('Appointment not found'));

    const existing = await Vaccination.findByRendezVous(rdvId);
    if (existing)
      return next(ApiError.badRequest('Vaccination already recorded for this appointment'));

    const session = await Session.findById(rdv.session_id);
    if (!session) return next(ApiError.notFound('Session not found'));
    if (session.statut !== 'EN_COURS') {
      return next(
        ApiError.badRequest('Session must be in progress (EN_COURS) to record vaccinations'),
      );
    }

    if (flacon_id) {
      const flacon = await Flacon.findById(flacon_id);
      if (!flacon) return next(ApiError.notFound('Vial not found'));
      if (flacon.session_id !== rdv.session_id) {
        return next(ApiError.badRequest('Vial does not belong to this session'));
      }

      const vaccinData = await Vaccin.findById(flacon.vaccin_id);
      if (!vaccinData) return next(ApiError.notFound('Vaccine not found'));
      if (flacon.doses_utilisees + flacon.doses_gaspillees >= vaccinData.doses_par_flacon) {
        return next(ApiError.badRequest('This vial has no remaining doses'));
      }
    }

    const vaccination = await Vaccination.create({
      rendez_vous_id: rdvId,
      personnel_id: personnelId,
      flacon_id: flacon_id || null,
      poids,
      taille,
      reactions,
    });

    if (flacon_id) await Flacon.incrementDose(flacon_id);
    await RendezVous.updateStatus(rdvId, 'PRESENT');

    return created(res, 'Vaccination recorded successfully', vaccination);
  }),

  getBySession: catchAsync(async (req, res) => {
    const vaccinations = await Vaccination.findBySession(req.params.sessionId);
    return success(res, 200, 'Session vaccinations retrieved', vaccinations);
  }),

  getByBebe: catchAsync(async (req, res, next) => {
    const bebeId = req.params.bebeId;

    if (req.user.role === 'parent') {
      const bebe = await Bebe.findById(bebeId);
      if (!bebe) return next(ApiError.notFound('Baby not found'));
      if (bebe.parent_id !== req.user.id) {
        return next(ApiError.forbidden('You can only view your own babies'));
      }
    }

    const vaccinations = await Vaccination.findByBebe(bebeId);
    return success(res, 200, 'Vaccination history retrieved', vaccinations);
  }),
};

module.exports = VaccinationController;
