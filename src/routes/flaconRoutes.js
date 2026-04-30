const express = require('express');
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
  FlaconController.open,
);

router.get(
  '/session/:sessionId',
  authenticate,
  authorize('infirmier', 'admin'),
  FlaconController.getBySession,
);

router.get(
  '/session/:sessionId/active',
  authenticate,
  authorize('infirmier', 'admin'),
  FlaconController.getActive,
);

router.patch(
  '/:id/waste',
  authenticate,
  authorize('infirmier', 'admin'),
  FlaconController.recordWaste,
);

router.patch(
  '/:id/force-close',
  authenticate,
  authorize('admin'),
  validate(schemas.forceCloseFlacon),
  FlaconController.forceClose,
);

module.exports = router;
