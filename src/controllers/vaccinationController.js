const Vaccination = require('../models/Vaccination');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');
const authorization = require('../services/resourceAuthorizationService');
const clinicalWorkflow = require('../services/clinicalWorkflowService');

const VaccinationController = {
  record: catchAsync(async (req, res, next) => {
    const { rdvId } = req.params;
    const { flacon_id, poids, taille, reactions } = req.body;
    const vaccination = await clinicalWorkflow.recordVaccination({
      user: req.user,
      rdvId,
      flaconId: flacon_id,
      poids,
      taille,
      reactions,
    });

    return created(res, 'Vaccination recorded successfully', vaccination);
  }),

  getBySession: catchAsync(async (req, res) => {
    await authorization.assertSessionAccess(req.user, req.params.sessionId);
    const vaccinations = await Vaccination.findBySession(req.params.sessionId);
    return success(res, 200, 'Session vaccinations retrieved', vaccinations);
  }),

  getByBebe: catchAsync(async (req, res, next) => {
    const bebeId = req.params.bebeId;

    await authorization.assertBebeAccess(req.user, bebeId);

    const vaccinations = await Vaccination.findByBebe(bebeId);
    return success(res, 200, 'Vaccination history retrieved', vaccinations);
  }),
};

module.exports = VaccinationController;
