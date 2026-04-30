const fs = require('fs');

function w(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('Created: ' + file);
}

// ==========================================
// FILE 1: Vaccination Model
// ==========================================
w(
  'src/models/Vaccination.js',
  `const { query } = require('../config/database');

const Vaccination = {
  async create(data) {
    const { rendez_vous_id, personnel_id, flacon_id, poids, taille, reactions } = data;
    const result = await query(
      'INSERT INTO vaccination (rendez_vous_id, personnel_id, flacon_id, poids, taille, reactions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [rendez_vous_id, personnel_id, flacon_id || null, poids || null, taille || null, reactions || null]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM vaccination WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByRendezVous(rdvId) {
    const result = await query('SELECT * FROM vaccination WHERE rendez_vous_id = $1', [rdvId]);
    return result.rows[0];
  },

  async findByRdv(rdvId) {
    return this.findByRendezVous(rdvId);
  },

  async findBySession(sessionId) {
    const result = await query(
      'SELECT vac.*, rdv.bebe_id, rdv.statut AS rdv_statut, ' +
      'b.prenom AS bebe_prenom, b.nom AS bebe_nom, ' +
      'p.nom AS personnel_nom, p.prenom AS personnel_prenom, ' +
      'f.numero_lot, f.fabricant ' +
      'FROM vaccination vac ' +
      'JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id ' +
      'JOIN bebe b ON b.id = rdv.bebe_id ' +
      'JOIN personnel p ON p.id = vac.personnel_id ' +
      'LEFT JOIN flacon f ON f.id = vac.flacon_id ' +
      'WHERE rdv.session_id = $1 ORDER BY vac.date_heure',
      [sessionId]
    );
    return result.rows;
  },

  async findByBebe(bebeId) {
    const result = await query(
      'SELECT vac.*, s.date_session, v.nom AS vaccin_nom, v.maladies_ciblees, ' +
      'f.numero_lot, f.fabricant, ' +
      'p.nom AS personnel_nom, p.prenom AS personnel_prenom ' +
      'FROM vaccination vac ' +
      'JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id ' +
      'JOIN session s ON s.id = rdv.session_id ' +
      'JOIN vaccin v ON v.id = s.vaccin_id ' +
      'LEFT JOIN flacon f ON f.id = vac.flacon_id ' +
      'JOIN personnel p ON p.id = vac.personnel_id ' +
      'WHERE rdv.bebe_id = $1 ORDER BY s.date_session DESC',
      [bebeId]
    );
    return result.rows;
  },

  async countBySession(sessionId) {
    const result = await query(
      'SELECT COUNT(*) AS total FROM vaccination vac ' +
      'JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id ' +
      'WHERE rdv.session_id = $1',
      [sessionId]
    );
    return parseInt(result.rows[0].total);
  },

  async updateFlacon(id, flacon_id) {
    const result = await query(
      'UPDATE vaccination SET flacon_id = $1 WHERE id = $2 RETURNING *',
      [flacon_id, id]
    );
    return result.rows[0];
  },
};

module.exports = Vaccination;
`,
);

// ==========================================
// FILE 2: Flacon Model
// ==========================================
w(
  'src/models/Flacon.js',
  `const { query } = require('../config/database');

const Flacon = {
  async create(data) {
    const { vaccin_id, session_id, numero_lot, fabricant } = data;
    const result = await query(
      'INSERT INTO flacon (vaccin_id, session_id, numero_lot, fabricant, date_ouverture) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
      [vaccin_id, session_id || null, numero_lot, fabricant]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM flacon WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findBySession(sessionId) {
    const result = await query(
      'SELECT * FROM flacon WHERE session_id = $1 ORDER BY date_ouverture',
      [sessionId]
    );
    return result.rows;
  },

  async findByVaccin(vaccinId) {
    const result = await query(
      'SELECT * FROM flacon WHERE vaccin_id = $1 AND date_ouverture IS NOT NULL ORDER BY date_ouverture',
      [vaccinId]
    );
    return result.rows;
  },

  async findActiveBySession(sessionId) {
    const result = await query(
      'SELECT * FROM flacon WHERE session_id = $1 AND doses_utilisees < (SELECT doses_par_flacon FROM vaccin WHERE vaccin.id = flacon.vaccin_id) ORDER BY date_ouverture LIMIT 1',
      [sessionId]
    );
    return result.rows[0];
  },

  async incrementDose(id) {
    const result = await query(
      'UPDATE flacon SET doses_utilisees = doses_utilisees + 1 WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async incrementDoses(id, doses = 1) {
    const result = await query(
      'UPDATE flacon SET doses_utilisees = doses_utilisees + $2 WHERE id = $1 RETURNING *',
      [id, doses]
    );
    return result.rows[0];
  },

  async addWaste(id) {
    const result = await query(
      'UPDATE flacon SET doses_gaspillees = doses_gaspillees + 1 WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async incrementGaspi(id, doses = 1) {
    const result = await query(
      'UPDATE flacon SET doses_gaspillees = doses_gaspillees + $2 WHERE id = $1 RETURNING *',
      [id, doses]
    );
    return result.rows[0];
  },

  async forceClose(id, justification) {
    const result = await query(
      'UPDATE flacon SET ouverture_forcee = TRUE, justification_forcee = $2 WHERE id = $1 RETURNING *',
      [id, justification]
    );
    return result.rows[0];
  },

  async openFlacon(id, force = false, justification = null) {
    if (force) return this.forceClose(id, justification);
    const result = await query(
      'UPDATE flacon SET date_ouverture = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async isEmpty(id) {
    const result = await query(
      'SELECT f.*, v.doses_par_flacon FROM flacon f JOIN vaccin v ON v.id = f.vaccin_id WHERE f.id = $1',
      [id]
    );
    if (!result.rows[0]) return null;
    const flacon = result.rows[0];
    return flacon.doses_utilisees + flacon.doses_gaspillees >= flacon.doses_par_flacon;
  },
};

module.exports = Flacon;
`,
);

// ==========================================
// FILE 3: Vaccination Controller
// ==========================================
w(
  'src/controllers/vaccinationController.js',
  `const Vaccination = require('../models/Vaccination');
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
    if (existing) return next(ApiError.badRequest('Vaccination already recorded for this appointment'));

    const session = await Session.findById(rdv.session_id);
    if (!session) return next(ApiError.notFound('Session not found'));
    if (session.statut !== 'EN_COURS') {
      return next(ApiError.badRequest('Session must be in progress (EN_COURS) to record vaccinations'));
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
`,
);

// ==========================================
// FILE 4: Flacon Controller
// ==========================================
w(
  'src/controllers/flaconController.js',
  `const Flacon = require('../models/Flacon');
const Session = require('../models/Session');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');

const FlaconController = {
  open: catchAsync(async (req, res, next) => {
    const { vaccin_id, session_id, numero_lot, fabricant } = req.body;

    if (session_id) {
      const session = await Session.findById(session_id);
      if (!session) return next(ApiError.notFound('Session not found'));
      if (!['EN_COURS', 'CONFIRMEE', 'EN_FORMATION'].includes(session.statut)) {
        return next(ApiError.badRequest('Cannot open vial for this session status'));
      }
    }

    const flacon = await Flacon.create({ vaccin_id, session_id, numero_lot, fabricant });
    return created(res, 'Vial opened successfully', flacon);
  }),

  getBySession: catchAsync(async (req, res) => {
    const flacons = await Flacon.findBySession(req.params.sessionId);
    return success(res, 200, 'Session vials retrieved', flacons);
  }),

  getActive: catchAsync(async (req, res, next) => {
    const flacon = await Flacon.findActiveBySession(req.params.sessionId);
    if (!flacon) return next(ApiError.notFound('No active vial found'));
    return success(res, 200, 'Active vial retrieved', flacon);
  }),

  recordWaste: catchAsync(async (req, res, next) => {
    const flacon = await Flacon.findById(req.params.id);
    if (!flacon) return next(ApiError.notFound('Vial not found'));

    const updated = await Flacon.addWaste(req.params.id);
    return success(res, 200, 'Waste recorded', updated);
  }),

  forceClose: catchAsync(async (req, res, next) => {
    const { justification } = req.body;
    if (!justification) return next(ApiError.badRequest('Justification is required for force close'));

    const flacon = await Flacon.findById(req.params.id);
    if (!flacon) return next(ApiError.notFound('Vial not found'));

    const updated = await Flacon.forceClose(req.params.id, justification);
    return success(res, 200, 'Vial force closed', updated);
  }),
};

module.exports = FlaconController;
`,
);

// ==========================================
// FILE 5: Vaccination Routes
// ==========================================
w(
  'src/routes/vaccinationRoutes.js',
  `const express = require('express');
const router = express.Router();
const VaccinationController = require('../controllers/vaccinationController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');

router.post(
  '/:rdvId',
  authenticate,
  authorize('infirmier', 'admin'),
  validate(schemas.recordVaccination),
  VaccinationController.record
);

router.get(
  '/session/:sessionId',
  authenticate,
  authorize('infirmier', 'admin'),
  VaccinationController.getBySession
);

router.get('/bebe/:bebeId', authenticate, VaccinationController.getByBebe);

module.exports = router;
`,
);

// ==========================================
// FILE 6: Flacon Routes
// ==========================================
w(
  'src/routes/flaconRoutes.js',
  `const express = require('express');
const router = express.Router();
const FlaconController = require('../controllers/flaconController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');

router.post(
  '/',
  authenticate,
  authorize('infirmier', 'admin'),
  validate(schemas.openFlacon),
  FlaconController.open
);

router.get(
  '/session/:sessionId',
  authenticate,
  authorize('infirmier', 'admin'),
  FlaconController.getBySession
);

router.get(
  '/session/:sessionId/active',
  authenticate,
  authorize('infirmier', 'admin'),
  FlaconController.getActive
);

router.patch('/:id/waste', authenticate, authorize('infirmier', 'admin'), FlaconController.recordWaste);

router.patch(
  '/:id/force-close',
  authenticate,
  authorize('admin'),
  validate(schemas.forceCloseFlacon),
  FlaconController.forceClose
);

module.exports = router;
`,
);

console.log('\nAll Day 9 files created!');
