'use strict';
var express = require('express');
var router = express.Router();
var authMiddleware = require('../middleware/authMiddleware');
var exportController = require('../controllers/exportController');
router.use(authMiddleware.authenticate);
router.get('/pdf', exportController.exportPDF);
router.get('/excel', exportController.exportExcel);
module.exports = router;

const exportDay22=require("../controllers/exportControllerDay22");
router.get("/vaccinations/pdf",authMiddleware.authenticate,exportDay22.exportVaccinationsPDF);
router.get("/vaccinations/excel",authMiddleware.authenticate,exportDay22.exportVaccinationsExcel);
router.get("/sessions/pdf",authMiddleware.authenticate,exportDay22.exportSessionsPDF);
router.get("/sessions/excel",authMiddleware.authenticate,exportDay22.exportSessionsExcel);
router.get("/absenteisme/pdf",authMiddleware.authenticate,exportDay22.exportAbsenteismePDF);
router.get("/absenteisme/excel",authMiddleware.authenticate,exportDay22.exportAbsenteismeExcel);
router.get("/stock/excel",authMiddleware.authenticate,exportDay22.exportStockExcel);
