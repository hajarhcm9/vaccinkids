const express = require('express');
const router = express.Router();
const VaccinController = require('../controllers/vaccinController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');

router.get('/', VaccinController.getAll);
router.get('/:id', VaccinController.getOne);
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(schemas.createVaccin),
  VaccinController.create,
);
router.patch('/:id', authenticate, authorize('admin'), VaccinController.update);
router.delete('/:id', authenticate, authorize('admin'), VaccinController.deactivate);

module.exports = router;
