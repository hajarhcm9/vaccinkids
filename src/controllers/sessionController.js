const Session = require('../models/Session');
const RendezVous = require('../models/RendezVous');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');
const authorization = require('../services/resourceAuthorizationService');
const bookingService = require('../services/bookingService');

const SessionController = {
  // Smart match: sessions for a given vaccine, sorted by fill rate.
  // Used by parent booking flow to prioritise nearly-full sessions.
  smartMatch: catchAsync(async (req, res, next) => {
    const { vaccin_id } = req.query;
    if (!vaccin_id) return next(ApiError.badRequest('vaccin_id requis'));

    const centre_id = req.user.centre_id;
    if (!centre_id) return next(ApiError.badRequest('Votre compte n\'est pas associé à un centre'));

    const sessions = await Session.findSmartMatch({
      centreId: centre_id,
      vaccinId: vaccin_id,
    });
    return success(res, 200, 'Sessions disponibles', sessions);
  }),

  getAvailable: catchAsync(async (req, res, next) => {
    let centreId;
    if (req.user.role === 'parent') {
      // Parent's sessions are always scoped to their registered centre
      centreId = req.user.centre_id || undefined;
    } else if (req.user.role === 'infirmier') {
      centreId = authorization.scopeCentre(req.user, req.query.centre_id);
    } else {
      centreId = req.query.centre_id;
    }
    const sessions = await Session.findAll({
      centreId,
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

  proposeByParent: catchAsync(async (req, res, next) => {
    const { vaccin_id, date_session, heure_debut, heure_fin, bebe_id } = req.body;
    const centre_id = req.user.centre_id;

    if (!vaccin_id || !date_session || !heure_debut || !bebe_id)
      return next(ApiError.badRequest('vaccin_id, date_session, heure_debut et bebe_id sont requis'));
    if (!centre_id)
      return next(ApiError.badRequest('Votre compte n\'est pas associé à un centre'));

    const { pool } = require('../config/database');

    // Check vaccine exists and is active
    const vaccinRes = await pool.query(
      'SELECT id, nom, doses_par_flacon FROM vaccin WHERE id = $1 AND est_actif = TRUE',
      [vaccin_id],
    );
    if (!vaccinRes.rows.length)
      return next(ApiError.notFound('Vaccin introuvable ou inactif'));
    const vaccin = vaccinRes.rows[0];

    // Check stock at this centre
    const stockRes = await pool.query(
      'SELECT quantite_disponible FROM stock WHERE centre_id = $1 AND vaccin_id = $2',
      [centre_id, vaccin_id],
    );
    const stock = stockRes.rows[0];
    if (!stock || stock.quantite_disponible <= 0)
      return next(ApiError.conflict(`Stock insuffisant pour ${vaccin.nom} dans votre centre`));

    // Check the baby belongs to this parent
    const bebeRes = await pool.query(
      'SELECT id FROM bebe WHERE id = $1 AND parent_id = $2',
      [bebe_id, req.user.id],
    );
    if (!bebeRes.rows.length)
      return next(ApiError.forbidden('Cet enfant ne vous appartient pas'));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const session = await Session.create({
        centre_id,
        vaccin_id,
        date_session,
        heure_debut,
        heure_fin: heure_fin || null,
        statut: 'EN_FORMATION',
      }, client);

      // Auto-book the proposing parent
      await client.query(
        `INSERT INTO rendez_vous (session_id, parent_id, bebe_id, statut)
         VALUES ($1, $2, $3, 'EN_ATTENTE')`,
        [session.id, req.user.id, bebe_id],
      );

      await client.query('COMMIT');
      return created(res, 'Séance proposée — elle sera confirmée une fois complète', {
        session: { ...session, vaccin_nom: vaccin.nom, places_restantes: vaccin.doses_par_flacon - 1 },
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
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
