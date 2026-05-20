'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const exportController = require('../controllers/exportController');

router.use(authenticate);

router.get('/vaccinations/pdf', authorize('admin'), exportController.exportVaccinationsPdf);
router.get('/vaccinations/excel', authorize('admin'), exportController.exportVaccinationsExcel);
router.get('/sessions/pdf', authorize('admin'), exportController.exportSessionsPdf);
router.get('/sessions/excel', authorize('admin'), exportController.exportSessionsExcel);
router.get('/absenteisme/pdf', authorize('admin'), exportController.exportAbsenteismePdf);
router.get('/absenteisme/excel', authorize('admin'), exportController.exportAbsenteismeExcel);
router.get('/stock/excel', authorize('admin'), exportController.exportStockExcel);

module.exports = router;
