const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const DelayAlertController = require('../controllers/delayAlertController');

// All routes require authentication
router.use(authenticate);

// Get delayed vaccines by centre - admin/infirmier
router.get(
  '/centre/:centreId',
  authorize('admin', 'infirmier'),
  DelayAlertController.getDelayedVaccinesByCentre,
);

// Get delayed vaccines for a baby - authenticated (parent for own baby, or admin/infirmier)
router.get(
  '/bebe/:bebeId',
  authorize('admin', 'infirmier', 'parent'),
  DelayAlertController.getDelayedVaccinesForBebe,
);

// Get delay dashboard - admin only
router.get('/dashboard', authorize('admin'), DelayAlertController.getDelayDashboard);

// Send delay alert notifications - admin only
router.post('/send-alerts', authorize('admin'), DelayAlertController.sendDelayAlerts);

module.exports = router;
