const fs = require('fs');

function w(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('Created: ' + file);
}

// ==========================================
// FILE 1: RendezVous Model
// ==========================================
w('src/models/RendezVous.js', `const { query } = require('../config/database');

const RendezVous = {
  async create(data) {
    const { session_id, parent_id, bebe_id } = data;
    const result = await query(
      'INSERT INTO rendez_vous (session_id, parent_id, bebe_id, statut) VALUES ($1, $2, $3, $4) RETURNING *',
      [session_id, parent_id, bebe_id, 'EN_ATTENTE']
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM rendez_vous WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByParent(parentId) {
    const result = await query(
      'SELECT rdv.*, s.date_session, s.heure_debut, s.heure_fin, s.statut AS session_statut, ' +
      'v.nom AS vaccin_nom, b.prenom AS bebe_prenom, b.nom AS bebe_nom ' +
      'FROM rendez_vous rdv ' +
      'JOIN session s ON s.id = rdv.session_id ' +
      'JOIN vaccin v ON v.id = s.vaccin_id ' +
      'JOIN bebe b ON b.id = rdv.bebe_id ' +
      'WHERE rdv.parent_id = $1 ORDER BY s.date_session DESC',
      [parentId]
    );
    return result.rows;
  },

  async findBySession(sessionId) {
    const result = await query(
      'SELECT rdv.*, b.prenom AS bebe_prenom, b.nom AS bebe_nom, ' +
      'p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone AS parent_telephone ' +
      'FROM rendez_vous rdv ' +
      'JOIN bebe b ON b.id = rdv.bebe_id ' +
      'JOIN parent p ON p.id = rdv.parent_id ' +
      'WHERE rdv.session_id = $1 ORDER BY rdv.date_creation',
      [sessionId]
    );
    return result.rows;
  },

  async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.statut) {
      values.push(filters.statut);
      conditions.push('rdv.statut = $' + idx++);
    }
    if (filters.sessionId) {
      values.push(filters.sessionId);
      conditions.push('rdv.session_id = $' + idx++);
    }
    if (filters.parentId) {
      values.push(filters.parentId);
      conditions.push('rdv.parent_id = $' + idx++);
    }
    if (filters.bebeId) {
      values.push(filters.bebeId);
      conditions.push('rdv.bebe_id = $' + idx++);
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const result = await query(
      'SELECT rdv.*, s.date_session, s.heure_debut, s.heure_fin, s.statut AS session_statut, ' +
      'v.nom AS vaccin_nom, b.prenom AS bebe_prenom, b.nom AS bebe_nom, ' +
      'p.nom AS parent_nom, p.prenom AS parent_prenom ' +
      'FROM rendez_vous rdv ' +
      'JOIN session s ON s.id = rdv.session_id ' +
      'JOIN vaccin v ON v.id = s.vaccin_id ' +
      'JOIN bebe b ON b.id = rdv.bebe_id ' +
      'JOIN parent p ON p.id = rdv.parent_id' + whereClause +
      ' ORDER BY s.date_session DESC, rdv.date_creation DESC',
      values
    );
    return result.rows;
  },

  async updateStatus(id, statut) {
    const result = await query(
      'UPDATE rendez_vous SET statut = $1 WHERE id = $2 RETURNING *',
      [statut, id]
    );
    return result.rows[0];
  },

  async countBySession(sessionId) {
    const result = await query(
      "SELECT COUNT(*) AS total, " +
      "COUNT(*) FILTER (WHERE statut NOT IN ('ANNULE')) AS actifs, " +
      "COUNT(*) FILTER (WHERE statut = 'EN_ATTENTE') AS en_attente, " +
      "COUNT(*) FILTER (WHERE statut = 'CONFIRME') AS confirmes, " +
      "COUNT(*) FILTER (WHERE statut = 'PRESENT') AS presents, " +
      "COUNT(*) FILTER (WHERE statut = 'ABSENT') AS absents, " +
      "COUNT(*) FILTER (WHERE statut = 'EN_LISTE_ATTENTE') AS en_liste_attente " +
      "FROM rendez_vous WHERE session_id = $1",
      [sessionId]
    );
    return result.rows[0];
  },

  async existsBySessionAndBebe(sessionId, bebeId) {
    const result = await query(
      "SELECT id FROM rendez_vous WHERE session_id = $1 AND bebe_id = $2 AND statut != 'ANNULE'",
      [sessionId, bebeId]
    );
    return result.rows.length > 0;
  },

  async getNextQueueNumber(sessionId) {
    const result = await query(
      'SELECT COALESCE(MAX(numero_attente), 0) + 1 AS next_number FROM rendez_vous WHERE session_id = $1',
      [sessionId]
    );
    return result.rows[0].next_number;
  },

  async assignQueueNumber(id, numero) {
    const result = await query(
      'UPDATE rendez_vous SET numero_attente = $1 WHERE id = $2 RETURNING *',
      [numero, id]
    );
    return result.rows[0];
  },
};

module.exports = RendezVous;
`);

// ==========================================
// FILE 2: RendezVous Controller
// ==========================================
w('src/controllers/rendezVousController.js', `const RendezVous = require('../models/RendezVous');
const Session = require('../models/Session');
const Bebe = require('../models/Bebe');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');

const RendezVousController = {
  // CREATE - Parent books appointment
  create: catchAsync(async (req, res, next) => {
    const { session_id, bebe_id } = req.body;
    const parentId = req.user.id;

    // Verify session exists and is bookable
    const session = await Session.findById(session_id);
    if (!session) return next(ApiError.notFound('Session not found'));
    if (session.statut === 'ANNULEE' || session.statut === 'TERMINEE') {
      return next(ApiError.badRequest('This session is no longer available for booking'));
    }

    // Check availability
    const counts = await RendezVous.countBySession(session_id);
    if (parseInt(counts.actifs) >= session.max_inscriptions) {
      return next(ApiError.badRequest('Session is full. No more spots available.'));
    }

    // Verify baby belongs to this parent
    const bebe = await Bebe.findById(bebe_id);
    if (!bebe) return next(ApiError.notFound('Baby not found'));
    if (bebe.parent_id !== parentId) {
      return next(ApiError.forbidden('This baby does not belong to you'));
    }

    // Check duplicate booking
    const exists = await RendezVous.existsBySessionAndBebe(session_id, bebe_id);
    if (exists) {
      return next(ApiError.badRequest('This baby already has an appointment for this session'));
    }

    const rdv = await RendezVous.create({ session_id, parent_id: parentId, bebe_id });
    return created(res, rdv, 'Appointment booked successfully');
  }),

  // READ ALL - List appointments
  getAll: catchAsync(async (req, res, next) => {
    const filters = {};

    // Parents can only see their own appointments
    if (req.user.role === 'parent') {
      filters.parentId = req.user.id;
    }

    // Allow filtering by query params
    if (req.query.statut) filters.statut = req.query.statut;
    if (req.query.sessionId) filters.sessionId = req.query.sessionId;
    if (req.query.bebeId) filters.bebeId = req.query.bebeId;

    const rendezVous = await RendezVous.findAll(filters);
    return success(res, rendezVous);
  }),

  // READ ONE
  getOne: catchAsync(async (req, res, next) => {
    const rdv = await RendezVous.findById(req.params.id);
    if (!rdv) return next(ApiError.notFound('Appointment not found'));

    // Parents can only see their own
    if (req.user.role === 'parent' && rdv.parent_id !== req.user.id) {
      return next(ApiError.forbidden('You can only view your own appointments'));
    }

    return success(res, rdv);
  }),

  // GET BY SESSION - All appointments for a session
  getBySession: catchAsync(async (req, res, next) => {
    const rdvs = await RendezVous.findBySession(req.params.sessionId);
    return success(res, rdvs);
  }),

  // GET AVAILABILITY
  getAvailability: catchAsync(async (req, res, next) => {
    const sessionId = req.params.sessionId;

    const session = await Session.findById(sessionId);
    if (!session) return next(ApiError.notFound('Session not found'));

    const counts = await RendezVous.countBySession(sessionId);
    const spotsLeft = session.max_inscriptions - parseInt(counts.actifs);

    return success(res, {
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

    const rdv = await RendezVous.findById(rdvId);
    if (!rdv) return next(ApiError.notFound('Appointment not found'));

    // Parents can only cancel their own
    if (req.user.role === 'parent' && rdv.parent_id !== req.user.id) {
      return next(ApiError.forbidden('You can only cancel your own appointments'));
    }

    // If confirming, assign queue number
    let updated;
    if (statut === 'CONFIRME') {
      updated = await RendezVous.updateStatus(rdvId, statut);
      const nextNum = await RendezVous.getNextQueueNumber(rdv.session_id);
      updated = await RendezVous.assignQueueNumber(rdvId, nextNum);
    } else {
      updated = await RendezVous.updateStatus(rdvId, statut);
    }

    return success(res, updated, 'Appointment status updated');
  }),

  // DELETE - Admin only (cancel)
  remove: catchAsync(async (req, res, next) => {
    const rdv = await RendezVous.findById(req.params.id);
    if (!rdv) return next(ApiError.notFound('Appointment not found'));

    await RendezVous.updateStatus(req.params.id, 'ANNULE');
    return success(res, null, 'Appointment cancelled');
  }),

  // GET MY APPOINTMENTS - Parent shortcut
  getMyAppointments: catchAsync(async (req, res, next) => {
    const rendezVous = await RendezVous.findByParent(req.user.id);
    return success(res, rendezVous);
  }),
};

module.exports = RendezVousController;
`);

// ==========================================
// FILE 3: RendezVous Routes
// ==========================================
w('src/routes/rendezVousRoutes.js', `const express = require('express');
const router = express.Router();
const RendezVousController = require('../controllers/rendezVousController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');

// Parent: book appointment
router.post(
  '/',
  authenticate,
  authorize('parent'),
  validate(schemas.createRendezVous),
  RendezVousController.create
);

// Parent: my appointments
router.get('/me', authenticate, authorize('parent'), RendezVousController.getMyAppointments);

// Session availability
router.get(
  '/session/:sessionId/availability',
  authenticate,
  Rendez VousController.getAvailability
);

// Session appointments (nurse/admin)
router.get(
  '/session/:sessionId',
  authenticate,
  authorize('infirmier', 'admin'),
  RendezVousController.getBySession
);

// All appointments (filtered)
router.get('/', authenticate, RendezVousController.getAll);

// Single appointment
router.get('/:id', authenticate, RendezVousController.getOne);

// Update status
router.patch(
  '/:id',
  authenticate,
  validate(schemas.updateRendezVous),
  RendezVousController.updateStatus
);

// Delete (admin only)
router.delete('/:id', authenticate, authorize('admin'), RendezVousController.remove);

module.exports = router;
`);

console.log('\nAll Day 8 files created!');
