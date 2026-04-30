const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const statistiqueController = require('../controllers/statistiqueController');

// All stats routes require auth + admin/infirmier role
router.use(authenticate);
router.use(authorize('admin', 'infirmier'));

router.get('/dashboard', statistiqueController.getDashboard);
router.get('/vaccinations-mensuelles', statistiqueController.getVaccinationsMensuelles);
router.get('/rdv-par-statut', statistiqueController.getRdvParStatut);
router.get('/stock-alertes', statistiqueController.getStockAlertes);
router.get('/top-vaccins', statistiqueController.getTopVaccins);

module.exports = router;
