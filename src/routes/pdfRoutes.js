const { Router } = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const pdfController = require('../controllers/pdfController');

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'infirmier'));

router.get('/vaccination-certificate/:vaccinationId', pdfController.downloadVaccinationCertificate);
router.get('/carnet/:bebeId', pdfController.downloadCarnet);
router.get('/rdv-confirmation/:rdvId', pdfController.downloadRdvConfirmation);

module.exports = router;
