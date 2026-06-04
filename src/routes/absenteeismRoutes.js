const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const AbsenteeismController = require('../controllers/absenteeismController');

// All routes require authentication
router.use(authenticate);

// Manual absence marking - nurse or admin only
router.post(
  '/mark-absent/:rdvId',
  authorize('infirmier', 'admin'),
  AbsenteeismController.markAbsent,
);

// Process all no-shows for a session - nurse or admin only
router.post(
  '/process-session/:sessionId',
  authorize('infirmier', 'admin'),
  AbsenteeismController.processSessionNoShows,
);

// Get habitual absents - admin only
router.get(
  '/habitual-absents',
  authorize('admin', 'infirmier'),
  AbsenteeismController.getHabitualAbsents,
);

// Get parent absence history - admin or nurse (or parent for themselves)
router.get(
  '/parent/:parentId/history',
  authorize('admin', 'infirmier'),
  AbsenteeismController.getParentAbsenceHistory,
);

// Get session absences - nurse or admin
router.get(
  '/session/:sessionId/absents',
  authorize('infirmier', 'admin'),
  AbsenteeismController.getSessionAbsences,
);

// Get absenteeism statistics - admin only
router.get('/stats', authorize('admin'), AbsenteeismController.getAbsenteismeStats);

module.exports = router;
