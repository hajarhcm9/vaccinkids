const Stock = require('../models/Stock');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');

const StockController = {
  getByCentre: catchAsync(async (req, res, next) => {
    const centreId = req.params.centreId || req.user.centre_id;
    if (!centreId) return next(ApiError.badRequest('Centre ID required'));
    const stock = await Stock.findByCentre(centreId);
    return success(res, 200, 'Stock retrieved', stock);
  }),

  getLowStock: catchAsync(async (req, res, next) => {
    const centreId = req.params.centreId || req.user.centre_id;
    if (!centreId) return next(ApiError.badRequest('Centre ID required'));
    const lowStock = await Stock.findLowStock(centreId);
    return success(res, 200, 'Low stock alerts retrieved', lowStock);
  }),

  upsert: catchAsync(async (req, res) => {
    const { centre_id, vaccin_id, quantite_disponible, seuil_alerte } = req.body;
    const stock = await Stock.createOrUpdate(centre_id, vaccin_id, {
      quantite_disponible,
      seuil_alerte,
    });
    return created(res, 'Stock updated successfully', stock);
  }),

  update: catchAsync(async (req, res, next) => {
    const stock = await Stock.update(req.params.id, req.body);
    if (!stock) return next(ApiError.notFound('Stock entry not found'));
    return success(res, 200, 'Stock updated', stock);
  }),
};

module.exports = StockController;
