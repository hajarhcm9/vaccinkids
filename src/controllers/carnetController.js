const Bebe = require('../models/Bebe');
const Croissance = require('../models/Croissance');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');
const { isValidQrCode } = require('../utils/qrCode');
const authorization = require('../services/resourceAuthorizationService');
const AuditLog = require('../models/AuditLog');

const auditQrRefusal = (req, reason) =>
  AuditLog.create({
    table_name: 'bebe',
    record_id: 0,
    action: 'READ',
    old_values: null,
    new_values: { path: req.originalUrl.split('?')[0], status: 'denied', reason },
    user_id: req.user?.id || null,
    user_role: req.user?.role || null,
    request_id: req.requestId,
  });

const CarnetController = {
  addBebe: catchAsync(async (req, res, next) => {
    const parentId  = req.user.id;
    const centre_id = req.user.centre_id || null;
    const existing  = await Bebe.findDuplicate(parentId, req.body);
    if (existing) return next(ApiError.conflict('This baby already exists for this parent'));
    const bebe = await Bebe.create({ ...req.body, parent_id: parentId, centre_id });
    return created(res, 'Baby added successfully', bebe);
  }),

  getBebes: catchAsync(async (req, res, next) => {
    const bebes = await Bebe.findByParent(req.user.id);
    return success(res, 200, 'Babies retrieved', bebes);
  }),

  getBebe: catchAsync(async (req, res, next) => {
    await authorization.assertBebeAccess(req.user, req.params.id);
    const bebe = await Bebe.findById(req.params.id);
    return success(res, 200, 'Baby details retrieved', bebe);
  }),

  updateBebe: catchAsync(async (req, res, next) => {
    await authorization.assertBebeAccess(req.user, req.params.id);
    const { prenom, nom, date_naissance, sexe } = req.body;
    const updated = await Bebe.update(req.params.id, {
      prenom,
      nom,
      date_naissance,
      sexe,
      is_newborn: false,
    });
    if (!updated) return next(ApiError.badRequest('Aucun champ à mettre à jour'));
    return success(res, 200, 'Profil mis à jour', updated);
  }),

  getVaccineHistory: catchAsync(async (req, res, next) => {
    await authorization.assertBebeAccess(req.user, req.params.id);
    const history = await Bebe.getVaccineHistory(req.params.id);
    return success(res, 200, 'Vaccination history retrieved', history);
  }),

  getCroissance: catchAsync(async (req, res, next) => {
    await authorization.assertBebeAccess(req.user, req.params.id);
    const croissance = await Bebe.getGrowthHistory(req.params.id);
    return success(res, 200, 'Growth history retrieved', croissance);
  }),

  getDelayedVaccines: catchAsync(async (req, res, next) => {
    await authorization.assertBebeAccess(req.user, req.params.id);
    const delayed = await Bebe.getDelayedVaccines(req.params.id);
    return success(res, 200, 'Delayed vaccines retrieved', delayed);
  }),

  getByQR: catchAsync(async (req, res, next) => {
    if (!isValidQrCode(req.params.code)) {
      await auditQrRefusal(req, 'invalid_or_obsolete_qr');
      return next(ApiError.badRequest('Invalid or obsolete QR code'));
    }
    const bebe = await Bebe.findByQRCode(req.params.code);
    if (!bebe) {
      await auditQrRefusal(req, 'baby_not_found');
      return next(ApiError.notFound('Baby not found — invalid QR code'));
    }
    const eligibleAppointments =
      req.user.role === 'infirmier'
        ? await Bebe.getEligibleAppointmentsAtCentre(bebe.id, req.user.centre_id)
        : [];
    if (req.user.role === 'infirmier' && eligibleAppointments.length === 0) {
      await auditQrRefusal(req, 'outside_centre_or_session_scope');
      return next(ApiError.forbidden('No eligible appointment for this baby at your centre today'));
    }
    const history = await Bebe.getVaccineHistory(bebe.id);
    return success(res, 200, 'Baby found via QR code', {
      bebe,
      eligibleAppointments,
      lastVaccinations: history.slice(0, 5),
    });
  }),

  addCroissance: catchAsync(async (req, res, next) => {
    await authorization.assertBebeAccess(req.user, req.params.id);
    const croissance = await Croissance.create({ bebe_id: req.params.id, ...req.body });
    return created(res, 'Growth measurement added', croissance);
  }),
};

module.exports = CarnetController;
