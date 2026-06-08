const crypto = require('crypto');
const Kiosk = require('../models/Kiosk');
const TokenService = require('../services/tokenService');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/responseHandler');
const config = require('../config');

const KioskController = {
  login: catchAsync(async (req, res, next) => {
    const { code, secret } = req.body;
    if (!code || !secret) return next(ApiError.badRequest('Kiosk code and secret are required'));
    const kiosk = await Kiosk.findActiveByCode(code);
    if (!kiosk || !kiosk.centre_actif || !(await Kiosk.verifySecret(kiosk, secret))) {
      return next(ApiError.unauthorized('Invalid or revoked kiosk identity'));
    }
    const accessToken = TokenService.generateKioskToken(kiosk);
    return success(res, 200, 'Kiosk activated', {
      accessToken,
      expiresInSeconds: config.surfaces.kioskTokenMinutes * 60,
      centre: { id: kiosk.centre_id },
    });
  }),

  list: catchAsync(async (req, res) => success(res, 200, 'Kiosks retrieved', await Kiosk.list())),

  create: catchAsync(async (req, res, next) => {
    const { code, centre_id } = req.body;
    if (!code || !centre_id) return next(ApiError.badRequest('code and centre_id are required'));
    const secret = crypto.randomBytes(24).toString('base64url');
    const kiosk = await Kiosk.create({ code, centreId: centre_id, secret });
    return created(res, 'Kiosk created; store the secret now', { ...kiosk, secret });
  }),

  rotate: catchAsync(async (req, res, next) => {
    const kiosk = await Kiosk.rotate(req.params.id);
    if (!kiosk) return next(ApiError.notFound('Kiosk not found'));
    return success(res, 200, 'Kiosk secret rotated', kiosk);
  }),

  revoke: catchAsync(async (req, res, next) => {
    const kiosk = await Kiosk.revoke(req.params.id);
    if (!kiosk) return next(ApiError.notFound('Kiosk not found'));
    return success(res, 200, 'Kiosk revoked', kiosk);
  }),
};

module.exports = KioskController;
