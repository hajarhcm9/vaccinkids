const express = require('express');
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
  VaccinationController.record,
);

router.get(
  '/session/:sessionId',
  authenticate,
  authorize('infirmier', 'admin'),
  VaccinationController.getBySession,
);

router.get('/bebe/:bebeId', authenticate, VaccinationController.getByBebe);

module.exports = router;
