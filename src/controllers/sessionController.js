const Session = require('../models/Session');
const RendezVous = require('../models/RendezVous');
const Bebe = require('../models/Bebe');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');

const REGISTRATION_OPEN_STATUSES = ['EN_FORMATION', 'CONFIRMEE'];

const SessionController = {
  getAvailable: catchAsync(async (req, res, next) => {
    const sessions = await Session.findAll({
      centreId: req.query.centre_id,
      vaccinId: req.query.vaccin_id,
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
    const session = await Session.update(req.params.id, { statut: 'EN_COURS' });
    if (!session) return next(ApiError.notFound('Session not found'));
    return success(res, 200, 'Session started', session);
  }),

  endSession: catchAsync(async (req, res, next) => {
    const session = await Session.update(req.params.id, { statut: 'TERMINEE' });
    if (!session) return next(ApiError.notFound('Session not found'));
    return success(res, 200, 'Session ended', session);
  }),

  cancelSession: catchAsync(async (req, res, next) => {
    const session = await Session.update(req.params.id, { statut: 'ANNULEE' });
    if (!session) return next(ApiError.notFound('Session not found'));
    return success(res, 200, 'Session cancelled', session);
  }),

  inscrire: catchAsync(async (req, res, next) => {
    const parentId = req.user.id;
    const sessionId = req.params.id;
    const { bebe_id } = req.body;
    if (!bebe_id) return next(ApiError.badRequest('bebe_id is required'));

    const session = await Session.findById(sessionId);
    if (!session) return next(ApiError.notFound('Session not found'));
    if (!REGISTRATION_OPEN_STATUSES.includes(session.statut)) {
      return next(ApiError.badRequest('Session is not open for registration'));
    }

    const bebe = await Bebe.findById(bebe_id);
    if (!bebe) return next(ApiError.notFound('Baby not found'));
    if (bebe.parent_id !== parentId) {
      return next(ApiError.forbidden('This baby does not belong to you'));
    }

    const activeRegistrations = await RendezVous.countActiveBySession(sessionId);
    if (activeRegistrations >= session.max_inscriptions) {
      return next(ApiError.conflict('Session is full'));
    }

    const rdv = await RendezVous.create({ session_id: sessionId, parent_id: parentId, bebe_id });
    return success(res, 201, 'Inscription successful', rdv);
  }),
};

module.exports = SessionController;
