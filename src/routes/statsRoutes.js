const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const StatsController = require('../controllers/statsController');

// All stats routes require authentication
router.use(authenticate);

// Dashboard KPIs - admin and nurse
router.get(
  '/dashboard',
  authorize('admin', 'infirmier'),
  StatsController.getDashboard
);

// Vaccination coverage - admin and nurse
router.get(
  '/couverture-vaccinale',
  authorize('admin', 'infirmier'),
  StatsController.getCouvertureVaccinale
);

// Session stats - admin and nurse
router.get(
  '/sessions',
  authorize('admin', 'infirmier'),
  StatsController.getSessionStats
);

// RDV stats - admin and nurse
router.get(
  '/rendez-vous',
  authorize('admin', 'infirmier'),
  StatsController.getRdvStats
);

// Stock stats - admin and nurse
router.get(
  '/stock',
  authorize('admin', 'infirmier'),
  StatsController.getStockStats
);

// Absenteeism stats - admin only
router.get(
  '/absenteisme',
  authorize('admin'),
  StatsController.getAbsenteeismeStats
);

// Growth stats - admin and nurse
router.get(
  '/croissance',
  authorize('admin', 'infirmier'),
  StatsController.getCroissanceStats
);

// Centre comparison - admin only
router.get(
  '/comparaison-centres',
  authorize('admin'),
  StatsController.getComparaisonCentres
);

// Export data - admin only
router.get(
  '/export',
  authorize('admin'),
  StatsController.getExportData
);

module.exports = router;
