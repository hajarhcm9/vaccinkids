const express = require('express');
const router = express.Router();
const CarnetController = require('../controllers/carnetController');
const CarnetEnhancedController = require('../controllers/carnetControllerEnhanced');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');

router.post(
  '/bebe',
  authenticate,
  authorize('parent'),
  validate(schemas.addBebe),
  CarnetController.addBebe,
);
router.get('/bebes', authenticate, authorize('parent'), CarnetController.getBebes);
router.get(
  '/bebe/:id/complete',
  authenticate,
  authorize('parent', 'infirmier', 'admin'),
  CarnetEnhancedController.getComplete,
);
router.get(
  '/bebe/:id',
  authenticate,
  authorize('parent', 'infirmier', 'admin'),
  CarnetController.getBebe,
);
router.get(
  '/bebe/:id/vaccinations',
  authenticate,
  authorize('parent', 'infirmier', 'admin'),
  CarnetController.getVaccineHistory,
);
router.get(
  '/bebe/:id/croissance',
  authenticate,
  authorize('parent', 'infirmier', 'admin'),
  CarnetController.getCroissance,
);
router.get(
  '/bebe/:id/retards',
  authenticate,
  authorize('parent', 'infirmier', 'admin'),
  CarnetController.getDelayedVaccines,
);
router.get('/qr/:code', authenticate, authorize('infirmier', 'admin'), CarnetController.getByQR);
router.post(
  '/bebe/:id/croissance',
  authenticate,
  authorize('infirmier', 'admin'),
  CarnetController.addCroissance,
);

module.exports = router;
