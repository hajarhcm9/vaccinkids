'use strict';
var express = require('express');
var router = express.Router();
var authMiddleware = require('../middleware/authMiddleware');
var exportController = require('../controllers/exportController');
var exportSecurity = require('../middleware/exportSecurity');
router.use(exportSecurity);
router.use(authMiddleware.authenticate);
var rbacMiddleware = require('../middleware/rbacMiddleware');
router.get('/pdf', rbacMiddleware.authorize('admin'), exportController.exportPDF);
router.get('/excel', rbacMiddleware.authorize('admin'), exportController.exportExcel);

const exportDay22 = require('../controllers/exportControllerDay22');
router.get('/vaccinations/pdf',    rbacMiddleware.authorize('admin'), exportDay22.exportVaccinationsPDF);
router.get('/vaccinations/excel',  rbacMiddleware.authorize('admin'), exportDay22.exportVaccinationsExcel);
router.get('/sessions/pdf',        rbacMiddleware.authorize('admin'), exportDay22.exportSessionsPDF);
router.get('/sessions/excel',      rbacMiddleware.authorize('admin'), exportDay22.exportSessionsExcel);
router.get('/absenteisme/pdf',     rbacMiddleware.authorize('admin'), exportDay22.exportAbsenteismePDF);
router.get('/absenteisme/excel',   rbacMiddleware.authorize('admin'), exportDay22.exportAbsenteismeExcel);
router.get('/stock/excel',         rbacMiddleware.authorize('admin'), exportDay22.exportStockExcel);

module.exports = router;
