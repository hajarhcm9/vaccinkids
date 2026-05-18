const { Router } = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const emailController = require('../controllers/emailController');

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'infirmier'));

router.post('/rdv-confirmation/:rdvId', emailController.sendRdvConfirmation);
router.post('/rdv-rappel/:rdvId', emailController.sendRdvReminder);
router.post('/vaccination-certificate/:vaccinationId', emailController.sendVaccinationCertificate);

module.exports = router;
