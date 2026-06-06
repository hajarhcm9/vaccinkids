const express = require('express');
const router = express.Router();
const StockController = require('../controllers/stockController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');

router.get(
  '/centre/:centreId',
  authenticate,
  authorize('infirmier', 'admin'),
  StockController.getByCentre,
);

router.get(
  '/centre/:centreId/low',
  authenticate,
  authorize('infirmier', 'admin'),
  StockController.getLowStock,
);

router.get('/movements', authenticate, authorize('admin'), StockController.getMovements);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(schemas.upsertStock),
  StockController.upsert,
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(schemas.updateStock),
  StockController.update,
);

module.exports = router;
