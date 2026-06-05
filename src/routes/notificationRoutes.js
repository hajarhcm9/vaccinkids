const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const notificationController = require('../controllers/notificationController');

// Merge notification schemas into the main schemas object
const notificationSchemas = require('../validators/notificationValidator');
Object.assign(schemas, notificationSchemas);

/**
 * @route   GET /api/notifications/me
 * @desc    Get the authenticated user's notifications (paginated)
 * @access  Parent, Infirmier, Admin
 */
router.get(
  '/me',
  authenticate,
  authorize('parent', 'infirmier', 'admin'),
  notificationController.getMyNotifications,
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Parent, Infirmier, Admin
 */
router.get(
  '/unread-count',
  authenticate,
  authorize('parent', 'infirmier', 'admin'),
  notificationController.getUnreadCount,
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Parent, Infirmier, Admin
 */
router.patch(
  '/:id/read',
  authenticate,
  authorize('parent', 'infirmier', 'admin'),
  notificationController.markAsRead,
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Parent, Infirmier, Admin
 */
router.patch(
  '/read-all',
  authenticate,
  authorize('parent', 'infirmier', 'admin'),
  notificationController.markAllRead,
);

/**
 * @route   POST /api/notifications/send
 * @desc    Send a manual notification (admin/infirmier only)
 * @access  Infirmier, Admin
 */
router.post(
  '/send',
  authenticate,
  authorize('infirmier', 'admin'),
  validate(schemas.notificationSend),
  notificationController.sendManual,
);

module.exports = router;
