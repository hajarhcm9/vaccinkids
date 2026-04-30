const express = require('express');
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
  VaccinControllerFull.create,
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(schemas.updateVaccin),
  VaccinControllerFull.update,
);

router.delete('/:id', authenticate, authorize('admin'), VaccinControllerFull.deactivate);

module.exports = router;
