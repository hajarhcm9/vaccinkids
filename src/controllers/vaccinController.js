const Vaccin = require('../models/Vaccin');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');

const VaccinController = {
  getAll: catchAsync(async (req, res, next) => {
    const activeOnly = req.query.all !== 'true';
    const vaccins = await Vaccin.findAll(activeOnly);
    return success(res, 200, 'Vaccines retrieved', vaccins);
  }),

  getOne: catchAsync(async (req, res, next) => {
    const vaccin = await Vaccin.findById(req.params.id);
    if (!vaccin) return next(ApiError.notFound('Vaccine not found'));
    return success(res, 200, 'Vaccine retrieved', vaccin);
  }),

  create: catchAsync(async (req, res, next) => {
    const vaccin = await Vaccin.create(req.body);
    return created(res, 'Vaccine created successfully', vaccin);
  }),

  update: catchAsync(async (req, res, next) => {
    const vaccin = await Vaccin.update(req.params.id, req.body);
    if (!vaccin) return next(ApiError.notFound('Vaccine not found'));
    return success(res, 200, 'Vaccine updated successfully', vaccin);
  }),

  deactivate: catchAsync(async (req, res, next) => {
    const vaccin = await Vaccin.deactivate(req.params.id);
    if (!vaccin) return next(ApiError.notFound('Vaccine not found'));
    return success(res, 200, 'Vaccine deactivated', vaccin);
  }),
};

module.exports = VaccinController;
