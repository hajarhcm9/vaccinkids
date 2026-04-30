const express = require('express');
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
  RendezVousController.create,
);

// Parent: my appointments
router.get('/me', authenticate, authorize('parent'), RendezVousController.getMyAppointments);

// Session availability
router.get('/session/:sessionId/availability', authenticate, RendezVousController.getAvailability);

// Session appointments (nurse/admin)
router.get(
  '/session/:sessionId',
  authenticate,
  authorize('infirmier', 'admin'),
  RendezVousController.getBySession,
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
  RendezVousController.updateStatus,
);

// Delete (admin only)
router.delete('/:id', authenticate, authorize('admin'), RendezVousController.remove);

module.exports = router;
