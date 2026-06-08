const express = require('express');
const KioskController = require('../controllers/kioskController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { requireWaitingRoomSurface } = require('../middleware/surfaceAvailability');

const router = express.Router();

router.post('/login', requireWaitingRoomSurface, KioskController.login);
router.get('/', authenticate, authorize('admin'), KioskController.list);
router.post('/', authenticate, authorize('admin'), KioskController.create);
router.post('/:id/rotate', authenticate, authorize('admin'), KioskController.rotate);
router.post('/:id/revoke', authenticate, authorize('admin'), KioskController.revoke);

module.exports = router;
