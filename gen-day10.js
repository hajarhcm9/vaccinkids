const fs = require('fs');

function w(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('Created: ' + file);
}

// ==========================================
// FILE 1: Stock Controller
// ==========================================
w(
  'src/controllers/stockController.js',
  `const Stock = require('../models/Stock');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');

const StockController = {
  getByCentre: catchAsync(async (req, res, next) => {
    const centreId = req.params.centreId || req.user.centre_id;
    if (!centreId) return next(ApiError.badRequest('Centre ID required'));
    const stock = await Stock.findByCentre(centreId);
    return success(res, 200, 'Stock retrieved', stock);
  }),

  getLowStock: catchAsync(async (req, res, next) => {
    const centreId = req.params.centreId || req.user.centre_id;
    if (!centreId) return next(ApiError.badRequest('Centre ID required'));
    const lowStock = await Stock.findLowStock(centreId);
    return success(res, 200, 'Low stock alerts retrieved', lowStock);
  }),

  upsert: catchAsync(async (req, res) => {
    const { centre_id, vaccin_id, quantite_disponible, seuil_alerte } = req.body;
    const stock = await Stock.createOrUpdate(centre_id, vaccin_id, {
      quantite_disponible,
      seuil_alerte,
    });
    return created(res, 'Stock updated successfully', stock);
  }),

  update: catchAsync(async (req, res, next) => {
    const stock = await Stock.update(req.params.id, req.body);
    if (!stock) return next(ApiError.notFound('Stock entry not found'));
    return success(res, 200, 'Stock updated', stock);
  }),
};

module.exports = StockController;
`,
);

// ==========================================
// FILE 2: Stock Routes
// ==========================================
w(
  'src/routes/stockRoutes.js',
  `const express = require('express');
const router = express.Router();
const StockController = require('../controllers/stockController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');

router.get(
  '/centre/:centreId',
  authenticate,
  authorize('infirmier', 'admin'),
  StockController.getByCentre
);

router.get(
  '/centre/:centreId/low',
  authenticate,
  authorize('infirmier', 'admin'),
  StockController.getLowStock
);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(schemas.upsertStock),
  StockController.upsert
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(schemas.updateStock),
  StockController.update
);

module.exports = router;
`,
);

// ==========================================
// FILE 3: Enhanced Carnet Controller
// ==========================================
w(
  'src/controllers/carnetControllerEnhanced.js',
  `const Bebe = require('../models/Bebe');
const Croissance = require('../models/Croissance');
const Vaccination = require('../models/Vaccination');
const RendezVous = require('../models/RendezVous');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/responseHandler');

const CarnetEnhancedController = {
  getComplete: catchAsync(async (req, res, next) => {
    const bebeId = req.params.id;

    const bebe = await Bebe.findById(bebeId);
    if (!bebe) return next(ApiError.notFound('Baby not found'));

    if (req.user.role === 'parent' && bebe.parent_id !== req.user.id) {
      return next(ApiError.forbidden('Access denied'));
    }

    const [vaccinations, croissance, delayedVaccines, upcomingRdvs] = await Promise.all([
      Vaccination.findByBebe(bebeId),
      Croissance.findByBebe(bebeId),
      Bebe.getDelayedVaccines(bebeId),
      RendezVous.findByParent(bebe.parent_id),
    ]);

    const babyUpcoming = upcomingRdvs.filter(
      (r) => r.bebe_id === parseInt(bebeId, 10) && !['ANNULE', 'PRESENT', 'ABSENT'].includes(r.statut)
    );

    const latestCroissance = croissance.length > 0 ? croissance[croissance.length - 1] : null;

    return success(res, 200, 'Complete health record retrieved', {
      bebe: {
        id: bebe.id,
        prenom: bebe.prenom,
        nom: bebe.nom,
        date_naissance: bebe.date_naissance,
        sexe: bebe.sexe,
        code_qr: bebe.code_qr,
        age_jours: Math.floor((Date.now() - new Date(bebe.date_naissance)) / (1000 * 60 * 60 * 24)),
      },
      stats: {
        vaccines_done: vaccinations.length,
        vaccines_delayed: delayedVaccines.length,
        has_growth_data: croissance.length > 0,
      },
      latest_growth: latestCroissance,
      vaccinations,
      croissance,
      delayed_vaccines: delayedVaccines,
      upcoming_appointments: babyUpcoming,
    });
  }),
};

module.exports = CarnetEnhancedController;
`,
);

// ==========================================
// FILE 4: Enhanced Vaccin Controller
// ==========================================
w(
  'src/controllers/vaccinControllerFull.js',
  `const Vaccin = require('../models/Vaccin');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');

const VaccinControllerFull = {
  getAll: catchAsync(async (req, res) => {
    const activeOnly = req.query.active !== 'false';
    const vaccins = await Vaccin.findAll(activeOnly);
    return success(res, 200, 'Vaccines retrieved', vaccins);
  }),

  getOne: catchAsync(async (req, res, next) => {
    const vaccin = await Vaccin.findById(req.params.id);
    if (!vaccin) return next(ApiError.notFound('Vaccine not found'));
    return success(res, 200, 'Vaccine retrieved', vaccin);
  }),

  create: catchAsync(async (req, res) => {
    const vaccin = await Vaccin.create(req.body);
    return created(res, 'Vaccine created successfully', vaccin);
  }),

  update: catchAsync(async (req, res, next) => {
    const vaccin = await Vaccin.update(req.params.id, req.body);
    if (!vaccin) return next(ApiError.notFound('Vaccine not found'));
    return success(res, 200, 'Vaccine updated', vaccin);
  }),

  deactivate: catchAsync(async (req, res, next) => {
    const vaccin = await Vaccin.deactivate(req.params.id);
    if (!vaccin) return next(ApiError.notFound('Vaccine not found'));
    return success(res, 200, 'Vaccine deactivated', vaccin);
  }),
};

module.exports = VaccinControllerFull;
`,
);

// ==========================================
// FILE 5: Updated Vaccin Routes (full CRUD)
// ==========================================
w(
  'src/routes/vaccinRoutesFull.js',
  `const express = require('express');
const router = express.Router();
const VaccinControllerFull = require('../controllers/vaccinControllerFull');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');

router.get('/', authenticate, VaccinControllerFull.getAll);
router.get('/:id', authenticate, VaccinControllerFull.getOne);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(schemas.createVaccin),
  VaccinControllerFull.create
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(schemas.updateVaccin),
  VaccinControllerFull.update
);

router.delete('/:id', authenticate, authorize('admin'), VaccinControllerFull.deactivate);

module.exports = router;
`,
);

// ==========================================
// FILE 6: Audit Middleware
// ==========================================
w(
  'src/middleware/auditMiddleware.js',
  `const AuditLog = require('../models/AuditLog');

const methodToAction = {
  POST: 'INSERT',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

const tableFromPath = (path) => {
  const segment = path.split('/').filter(Boolean)[1];
  const map = {
    carnet: 'bebe',
    flacons: 'flacon',
    'rendez-vous': 'rendez_vous',
    sessions: 'session',
    stock: 'stock',
    vaccins: 'vaccin',
    vaccinations: 'vaccination',
  };
  return map[segment] || segment || 'unknown';
};

const auditMiddleware = (req, res, next) => {
  const action = methodToAction[req.method];
  if (!action || !req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/api/auth')) {
    return next();
  }

  const originalJson = res.json.bind(res);
  let responseBody;

  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    if (res.statusCode >= 400) return;

    const data = responseBody && responseBody.data;
    const record = Array.isArray(data) ? data[0] : data;
    const recordId = record && typeof record === 'object' && record.id ? record.id : 0;

    AuditLog.create({
      table_name: tableFromPath(req.originalUrl),
      record_id: recordId,
      action,
      old_values: null,
      new_values: record && typeof record === 'object' ? record : null,
      user_id: req.user ? req.user.id : null,
      user_role: req.user ? req.user.role : null,
    }).catch((error) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Audit logging failed:', error.message);
      }
    });
  });

  return next();
};

module.exports = auditMiddleware;
`,
);

console.log('\nAll Day 10 files created!');
