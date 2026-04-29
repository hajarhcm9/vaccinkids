const express = require('express');
const router = express.Router();
const CarnetController = require('../controllers/carnetController');
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
router.get('/bebe/:id', authenticate, CarnetController.getBebe);
router.get('/bebe/:id/vaccinations', authenticate, CarnetController.getVaccineHistory);
router.get('/bebe/:id/croissance', authenticate, CarnetController.getCroissance);
router.get('/bebe/:id/retards', authenticate, CarnetController.getDelayedVaccines);
router.get('/qr/:code', authenticate, authorize('infirmier', 'admin'), CarnetController.getByQR);
router.post(
  '/bebe/:id/croissance',
  authenticate,
  authorize('infirmier', 'admin'),
  CarnetController.addCroissance,
);

module.exports = router;
