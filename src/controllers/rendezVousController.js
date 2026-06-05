const RendezVous = require('../models/RendezVous');
const Session = require('../models/Session');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');
const authorization = require('../services/resourceAuthorizationService');
const bookingService = require('../services/bookingService');

const RendezVousController = {
  // CREATE - Parent books appointment
  create: catchAsync(async (req, res, next) => {
    const { session_id, bebe_id } = req.body;
    const rdv = await bookingService.book({
      parentId: req.user.id,
      sessionId: session_id,
      bebeId: bebe_id,
      allowedStatuses: ['EN_FORMATION', 'CONFIRMEE', 'EN_COURS'],
    });
    return created(res, 'Appointment booked successfully', rdv);
  }),

  // READ ALL - List appointments
  getAll: catchAsync(async (req, res, next) => {
    const filters = {};

    // Parents can only see their own appointments
    if (req.user.role === 'parent') {
      filters.parentId = req.user.id;
    } else if (req.user.role === 'infirmier') {
      filters.centreId = authorization.scopeCentre(req.user, req.query.centreId);
    }

    // Allow filtering by query params
    if (req.query.statut) filters.statut = req.query.statut;
    if (req.query.sessionId) filters.sessionId = req.query.sessionId;
    if (req.query.bebeId) filters.bebeId = req.query.bebeId;

    const rendezVous = await RendezVous.findAll(filters);
    return success(res, 200, 'Success', rendezVous);
  }),

  // READ ONE
  getOne: catchAsync(async (req, res, next) => {
    const rdv = await authorization.assertRendezVousAccess(req.user, req.params.id);
    return success(res, 200, 'Success', rdv);
  }),

  // GET BY SESSION - All appointments for a session
  getBySession: catchAsync(async (req, res, next) => {
    await authorization.assertSessionAccess(req.user, req.params.sessionId);
    const rdvs = await RendezVous.findBySession(req.params.sessionId);
    return success(res, 200, 'Success', rdvs);
  }),

  // GET AVAILABILITY
  getAvailability: catchAsync(async (req, res, next) => {
    const sessionId = req.params.sessionId;

    const session = await Session.findById(sessionId);
    if (!session) return next(ApiError.notFound('Session not found'));

    const counts = await RendezVous.countBySession(sessionId);
    const spotsLeft = session.max_inscriptions - parseInt(counts.actifs);

    return success(res, 200, 'Success', {
      session_id: sessionId,
      date_session: session.date_session,
      heure_debut: session.heure_debut,
      heure_fin: session.heure_fin,
      statut: session.statut,
      max_inscriptions: session.max_inscriptions,
      inscrits: parseInt(counts.actifs),
      places_restantes: Math.max(0, spotsLeft),
      en_attente: parseInt(counts.en_attente),
      confirmes: parseInt(counts.confirmes),
      en_liste_attente: parseInt(counts.en_liste_attente),
      disponible: spotsLeft > 0 && !['ANNULEE', 'TERMINEE'].includes(session.statut),
    });
  }),

  // UPDATE STATUS
  updateStatus: catchAsync(async (req, res, next) => {
    const { statut } = req.body;
    const rdvId = req.params.id;

    const validStatuses = {
      parent: ['ANNULE'],
      infirmier: ['CONFIRME', 'PRESENT', 'ABSENT', 'EN_LISTE_ATTENTE'],
      admin: ['EN_ATTENTE', 'CONFIRME', 'PRESENT', 'ABSENT', 'ANNULE', 'EN_LISTE_ATTENTE'],
    };

    if (!validStatuses[req.user.role].includes(statut)) {
      return next(ApiError.forbidden('You cannot set status to ' + statut));
    }

    const rdv = await authorization.assertRendezVousAccess(req.user, rdvId);

    // If confirming, assign queue number
    let updated;
    if (statut === 'CONFIRME') {
      updated = await RendezVous.updateStatus(rdvId, statut);
      const nextNum = await RendezVous.getNextQueueNumber(rdv.session_id);
      updated = await RendezVous.assignQueueNumber(rdvId, nextNum);
    } else {
      updated = await RendezVous.updateStatus(rdvId, statut);
    }

    return success(res, 200, 'Appointment status updated', updated);
  }),

  // DELETE - Admin only (cancel)
  remove: catchAsync(async (req, res, next) => {
    const rdv = await RendezVous.findById(req.params.id);
    if (!rdv) return next(ApiError.notFound('Appointment not found'));

    await RendezVous.updateStatus(req.params.id, 'ANNULE');
    return success(res, 200, 'Appointment cancelled');
  }),

  // GET MY APPOINTMENTS - Parent shortcut
  getMyAppointments: catchAsync(async (req, res, next) => {
    const rendezVous = await RendezVous.findByParent(req.user.id);
    return success(res, 200, 'Success', rendezVous);
  }),
};

module.exports = RendezVousController;
