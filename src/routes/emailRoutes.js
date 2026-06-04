const express = require('express');
var router = express.Router();
var authMiddleware = require('../middleware/authMiddleware');
var rbacMiddleware = require('../middleware/rbacMiddleware');
var emailController = require('../controllers/emailController');

router.post(
  '/rdv-confirmation/:rdvId',
  authMiddleware.authenticate,
  rbacMiddleware.authorize('admin', 'infirmier'),
  emailController.sendRdvConfirmation,
);

router.post(
  '/rdv-rappel/:rdvId',
  authMiddleware.authenticate,
  rbacMiddleware.authorize('admin', 'infirmier'),
  emailController.sendRdvReminder,
);

router.post(
  '/vaccination-certificate/:vaccinationId',
  authMiddleware.authenticate,
  rbacMiddleware.authorize('admin', 'infirmier'),
  emailController.sendVaccinationCertificate,
);

module.exports = router;
