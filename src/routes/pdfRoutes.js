const express = require('express');
var router = express.Router();
var authMiddleware = require('../middleware/authMiddleware');
var rbacMiddleware = require('../middleware/rbacMiddleware');
var pdfController = require('../controllers/pdfController');

router.get(
  '/vaccination-certificate/:vaccinationId',
  authMiddleware.authenticate,
  rbacMiddleware.authorize('admin', 'infirmier'),
  pdfController.downloadVaccinationCertificate
);

router.get(
  '/carnet/:bebeId',
  authMiddleware.authenticate,
  rbacMiddleware.authorize('admin', 'infirmier'),
  pdfController.downloadCarnet
);

router.get(
  '/rdv-confirmation/:rdvId',
  authMiddleware.authenticate,
  rbacMiddleware.authorize('admin', 'infirmier'),
  pdfController.downloadRdvConfirmation
);

module.exports = router;
