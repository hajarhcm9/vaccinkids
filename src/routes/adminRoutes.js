const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const AdminController = require('../controllers/adminController');

// ALL admin routes require authentication + admin role
router.use(authenticate);
router.use(authorize('admin'));

// ==========================================
// PERSONNEL MANAGEMENT
// ==========================================

router.post('/personnel', AdminController.createPersonnel);
router.get('/personnel', AdminController.getPersonnel);
router.get('/personnel/:id', AdminController.getPersonnelById);
router.patch('/personnel/:id', AdminController.updatePersonnel);
router.patch('/personnel/:id/deactivate', AdminController.deactivatePersonnel);
router.patch('/personnel/:id/reactivate', AdminController.reactivatePersonnel);

// ==========================================
// CENTRE MANAGEMENT
// ==========================================

router.post('/centres', AdminController.createCentre);
router.get('/centres', AdminController.getCentres);
router.get('/centres/:id', AdminController.getCentreById);
router.patch('/centres/:id', AdminController.updateCentre);
router.patch('/centres/:id/deactivate', AdminController.deactivateCentre);

// ==========================================
// AUDIT LOG
// ==========================================

router.get('/audit-log/stats', AdminController.getAuditStats);
router.get('/audit-log', AdminController.getAuditLog);

// ==========================================
// SYSTEM INFO
// ==========================================

router.get('/system-info', AdminController.getSystemInfo);

module.exports = router;
