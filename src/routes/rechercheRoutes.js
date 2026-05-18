const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const rechercheController = require('../controllers/rechercheController');

router.use(authenticate);
router.use(authorize('admin', 'infirmier'));

router.get('/global', rechercheController.searchGlobal);
router.get('/rendez-vous', rechercheController.searchRendezVous);
router.get('/vaccinations', rechercheController.searchVaccinations);
router.get('/sessions', rechercheController.searchSessions);

module.exports = router;
