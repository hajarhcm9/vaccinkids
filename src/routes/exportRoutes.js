'use strict';
var express = require('express');
var router = express.Router();
var authMiddleware = require('../middleware/authMiddleware');
var exportController = require('../controllers/exportController');
router.use(authMiddleware.authenticate);
var rbacMiddleware = require('../middleware/rbacMiddleware');
router.get('/pdf', rbacMiddleware.authorize('admin'), exportController.exportPDF);
router.get('/excel', rbacMiddleware.authorize('admin'), exportController.exportExcel);
module.exports = router;

const exportDay22=require("../controllers/exportControllerDay22");
router.get("/vaccinations/pdf",authMiddleware.authenticate, rbacMiddleware.authorize('admin'), exportDay22.exportVaccinationsPDF);
router.get("/vaccinations/excel",authMiddleware.authenticate, rbacMiddleware.authorize('admin'), exportDay22.exportVaccinationsExcel);
router.get("/sessions/pdf",authMiddleware.authenticate, rbacMiddleware.authorize('admin'), exportDay22.exportSessionsPDF);
router.get("/sessions/excel",authMiddleware.authenticate, rbacMiddleware.authorize('admin'), exportDay22.exportSessionsExcel);
router.get("/absenteisme/pdf",authMiddleware.authenticate, rbacMiddleware.authorize('admin'), exportDay22.exportAbsenteismePDF);
router.get("/absenteisme/excel",authMiddleware.authenticate, rbacMiddleware.authorize('admin'), exportDay22.exportAbsenteismeExcel);
router.get("/stock/excel",authMiddleware.authenticate, rbacMiddleware.authorize('admin'), exportDay22.exportStockExcel);
