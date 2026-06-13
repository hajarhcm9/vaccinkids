const express = require('express');
const router = express.Router();
const SessionController = require('../controllers/sessionController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');

router.get('/', authenticate, SessionController.getAvailable);
router.get('/today', authenticate, authorize('infirmier', 'admin'), SessionController.getToday);
router.get('/:id', authenticate, SessionController.getOne);
router.post('/:id/inscrire', authenticate, authorize('parent'), SessionController.inscrire);
router.post('/:id/waitlist', authenticate, authorize('parent'), SessionController.joinWaitlist);
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(schemas.createSession),
  SessionController.create,
);
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(schemas.updateSession),
  SessionController.update,
);
router.patch('/:id/confirm', authenticate, authorize('admin'), SessionController.confirmSession);
router.patch(
  '/:id/start',
  authenticate,
  authorize('infirmier', 'admin'),
  SessionController.startSession,
);
router.patch(
  '/:id/end',
  authenticate,
  authorize('infirmier', 'admin'),
  SessionController.endSession,
);
router.patch('/:id/cancel', authenticate, authorize('admin'), SessionController.cancelSession);

module.exports = router;
