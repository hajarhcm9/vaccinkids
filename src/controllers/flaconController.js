const Flacon = require('../models/Flacon');
const Session = require('../models/Session');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');
const authorization = require('../services/resourceAuthorizationService');
const clinicalWorkflow = require('../services/clinicalWorkflowService');

const FlaconController = {
  open: catchAsync(async (req, res, next) => {
    const { vaccin_id, session_id, numero_lot, fabricant } = req.body;

    if (session_id) {
      const session = await Session.findById(session_id);
      if (!session) return next(ApiError.notFound('Session not found'));
      if (req.user.role === 'infirmier')
        authorization.assertCentreAccess(req.user, session.centre_id);
      if (!['EN_COURS', 'CONFIRMEE', 'EN_FORMATION'].includes(session.statut)) {
        return next(ApiError.badRequest('Cannot open vial for this session status'));
      }
      if (Number(session.vaccin_id) !== Number(vaccin_id)) {
        return next(ApiError.badRequest('Vial vaccine must match the session vaccine'));
      }
    }

    const flacon = await Flacon.create({ vaccin_id, session_id, numero_lot, fabricant });
    return created(res, 'Vial opened successfully', flacon);
  }),

  getBySession: catchAsync(async (req, res) => {
    await authorization.assertSessionAccess(req.user, req.params.sessionId);
    const flacons = await Flacon.findBySession(req.params.sessionId);
    return success(res, 200, 'Session vials retrieved', flacons);
  }),

  getActive: catchAsync(async (req, res, next) => {
    await authorization.assertSessionAccess(req.user, req.params.sessionId);
    const flacon = await Flacon.findActiveBySession(req.params.sessionId);
    if (!flacon) return next(ApiError.notFound('No active vial found'));
    return success(res, 200, 'Active vial retrieved', flacon);
  }),

  recordWaste: catchAsync(async (req, res, next) => {
    const updated = await clinicalWorkflow.recordWaste({ user: req.user, flaconId: req.params.id });
    return success(res, 200, 'Waste recorded', updated);
  }),

  forceClose: catchAsync(async (req, res, next) => {
    const { justification } = req.body;
    if (!justification)
      return next(ApiError.badRequest('Justification is required for force close'));

    const flacon = await Flacon.findById(req.params.id);
    if (!flacon) return next(ApiError.notFound('Vial not found'));

    const updated = await Flacon.forceClose(req.params.id, justification);
    return success(res, 200, 'Vial force closed', updated);
  }),
};

module.exports = FlaconController;
