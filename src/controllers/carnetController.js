const Bebe = require('../models/Bebe');
const Croissance = require('../models/Croissance');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');

const CarnetController = {
  addBebe: catchAsync(async (req, res, next) => {
    const parentId = req.user.id;
    const existing = await Bebe.findDuplicate(parentId, req.body);
    if (existing) return next(ApiError.conflict('This baby already exists for this parent'));
    const bebe = await Bebe.create({ ...req.body, parent_id: parentId });
    return created(res, 'Baby added successfully', bebe);
  }),

  getBebes: catchAsync(async (req, res, next) => {
    const bebes = await Bebe.findByParent(req.user.id);
    return success(res, 200, 'Babies retrieved', bebes);
  }),

  getBebe: catchAsync(async (req, res, next) => {
    const bebe = await Bebe.findById(req.params.id);
    if (!bebe) return next(ApiError.notFound('Baby not found'));
    if (req.user.role === 'parent' && bebe.parent_id !== req.user.id)
      return next(ApiError.forbidden('You can only view your own babies'));
    return success(res, 200, 'Baby details retrieved', bebe);
  }),

  getVaccineHistory: catchAsync(async (req, res, next) => {
    const bebe = await Bebe.findById(req.params.id);
    if (!bebe) return next(ApiError.notFound('Baby not found'));
    if (req.user.role === 'parent' && bebe.parent_id !== req.user.id)
      return next(ApiError.forbidden('Access denied'));
    const history = await Bebe.getVaccineHistory(req.params.id);
    return success(res, 200, 'Vaccination history retrieved', history);
  }),

  getCroissance: catchAsync(async (req, res, next) => {
    const bebe = await Bebe.findById(req.params.id);
    if (!bebe) return next(ApiError.notFound('Baby not found'));
    if (req.user.role === 'parent' && bebe.parent_id !== req.user.id)
      return next(ApiError.forbidden('Access denied'));
    const croissance = await Bebe.getGrowthHistory(req.params.id);
    return success(res, 200, 'Growth history retrieved', croissance);
  }),

  getDelayedVaccines: catchAsync(async (req, res, next) => {
    const bebe = await Bebe.findById(req.params.id);
    if (!bebe) return next(ApiError.notFound('Baby not found'));
    if (req.user.role === 'parent' && bebe.parent_id !== req.user.id)
      return next(ApiError.forbidden('Access denied'));
    const delayed = await Bebe.getDelayedVaccines(req.params.id);
    return success(res, 200, 'Delayed vaccines retrieved', delayed);
  }),

  getByQR: catchAsync(async (req, res, next) => {
    const bebe = await Bebe.findByQRCode(req.params.code);
    if (!bebe) return next(ApiError.notFound('Baby not found — invalid QR code'));
    const history = await Bebe.getVaccineHistory(bebe.id);
    return success(res, 200, 'Baby found via QR code', {
      bebe,
      lastVaccinations: history.slice(0, 5),
    });
  }),

  addCroissance: catchAsync(async (req, res, next) => {
    const bebe = await Bebe.findById(req.params.id);
    if (!bebe) return next(ApiError.notFound('Baby not found'));
    const croissance = await Croissance.create({ bebe_id: req.params.id, ...req.body });
    return created(res, 'Growth measurement added', croissance);
  }),
};

module.exports = CarnetController;
