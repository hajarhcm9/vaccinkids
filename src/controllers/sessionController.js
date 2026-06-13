const Session = require('../models/Session');
const RendezVous = require('../models/RendezVous');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');
const authorization = require('../services/resourceAuthorizationService');
const bookingService = require('../services/bookingService');

const SessionController = {
  getAvailable: catchAsync(async (req, res, next) => {
    const sessions = await Session.findAll({
      centreId:
        req.user.role === 'infirmier'
          ? authorization.scopeCentre(req.user, req.query.centre_id)
          : req.query.centre_id,
      vaccinId: req.query.vaccin_id,
      upcomingOnly: req.user.role === 'parent',
    });
    return success(res, 200, 'Available sessions retrieved', sessions);
  }),

  getToday: catchAsync(async (req, res, next) => {
    const centreId = req.user.centre_id;
    if (!centreId) return next(ApiError.badRequest('No centre assigned'));
    const sessions = await Session.findAll({
      centreId,
      dateSession: new Date().toISOString().slice(0, 10),
    });
    return success(res, 200, "Today's sessions retrieved", sessions);
  }),

  getOne: catchAsync(async (req, res, next) => {
    if (req.user.role === 'infirmier') {
      await authorization.assertSessionAccess(req.user, req.params.id);
    }
    const session = await Session.findById(req.params.id);
    if (!session) return next(ApiError.notFound('Session not found'));
    return success(res, 200, 'Session retrieved', session);
  }),

  create: catchAsync(async (req, res, next) => {
    const session = await Session.create(req.body);
    return created(res, 'Session created successfully', session);
  }),

  update: catchAsync(async (req, res, next) => {
    const session = await Session.update(req.params.id, req.body);
    if (!session) return next(ApiError.notFound('Session not found'));
    return success(res, 200, 'Session updated successfully', session);
  }),

  startSession: catchAsync(async (req, res, next) => {
    await authorization.assertSessionAccess(req.user, req.params.id);
    const session = await Session.transition(req.params.id, 'EN_COURS', ['CONFIRMEE']);
    if (!session) return next(ApiError.conflict('Session must be CONFIRMEE before starting'));
    return success(res, 200, 'Session started', session);
  }),

  confirmSession: catchAsync(async (req, res, next) => {
    const session = await Session.transition(req.params.id, 'CONFIRMEE', [
      'EN_FORMATION',
      'PLANIFIEE',
    ]);
    if (!session)
      return next(ApiError.conflict('Session cannot be confirmed from its current status'));
    return success(res, 200, 'Session confirmed', session);
  }),

  endSession: catchAsync(async (req, res, next) => {
    await authorization.assertSessionAccess(req.user, req.params.id);
    const session = await Session.endAndMarkAbsent(req.params.id);
    if (!session) return next(ApiError.conflict('Session must be EN_COURS before ending'));
    return success(res, 200, 'Session ended', session);
  }),

  cancelSession: catchAsync(async (req, res, next) => {
    const session = await Session.transition(req.params.id, 'ANNULEE', [
      'EN_FORMATION',
      'PLANIFIEE',
      'CONFIRMEE',
    ]);
    if (!session)
      return next(ApiError.conflict('Session cannot be cancelled from its current status'));
    return success(res, 200, 'Session cancelled', session);
  }),

  inscrire: catchAsync(async (req, res, next) => {
    const parentId = req.user.id;
    const sessionId = req.params.id;
    const { bebe_id } = req.body;
    if (!bebe_id) return next(ApiError.badRequest('bebe_id is required'));

    const rdv = await bookingService.book({ parentId, sessionId, bebeId: bebe_id });
    return success(res, 201, 'Inscription successful', rdv);
  }),

  joinWaitlist: catchAsync(async (req, res, next) => {
    const parentId = req.user.id;
    const sessionId = req.params.id;
    const { bebe_id } = req.body;
    if (!bebe_id) return next(ApiError.badRequest('bebe_id is required'));

    const rdv = await bookingService.joinWaitlist({ parentId, sessionId, bebeId: bebe_id });
    const counts = await RendezVous.countBySession(sessionId);
    return success(res, 201, 'Waitlist registration successful', {
      ...rdv,
      position: parseInt(counts.en_liste_attente),
    });
  }),
};

module.exports = SessionController;
