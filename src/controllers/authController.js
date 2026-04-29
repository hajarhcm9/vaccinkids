const bcrypt = require('bcrypt');
const OtpService = require('../services/otpService');
const SmsService = require('../services/smsService');
const TokenService = require('../services/tokenService');
const Parent = require('../models/Parent');
const Personnel = require('../models/Personnel');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { isValidMoroccanPhone, normalizePhone, isValidCIN } = require('../utils/validator');
const { success, created } = require('../utils/responseHandler');

const AuthController = {
  // ---- PARENT OTP AUTH ----

  sendOTP: catchAsync(async (req, res, next) => {
    const { telephone } = req.body;
    if (!telephone) return next(ApiError.badRequest('Phone number is required'));
    if (!isValidMoroccanPhone(telephone))
      return next(
        ApiError.badRequest(
          'Invalid Moroccan phone number. Use format: +212XXXXXXXXX or 06XXXXXXXX',
        ),
      );

    const normalizedPhone = normalizePhone(telephone);
    const otpResult = await OtpService.generateOTP(normalizedPhone);
    const smsResult = await SmsService.sendOTP(normalizedPhone, otpResult.otp);

    const responseData = {
      telephone: normalizedPhone,
      expiryMinutes: otpResult.expiryMinutes,
      otpSent: smsResult.success,
      mode: smsResult.mode,
    };
    if (process.env.NODE_ENV === 'development') responseData.devOtp = otpResult.otp;

    return success(res, 200, 'OTP code sent successfully', responseData);
  }),

  verifyOTP: catchAsync(async (req, res, next) => {
    const { telephone, code } = req.body;
    if (!telephone || !code)
      return next(ApiError.badRequest('Phone number and OTP code are required'));

    const normalizedPhone = normalizePhone(telephone);
    const otpResult = await OtpService.verifyOTP(normalizedPhone, code);
    if (!otpResult.valid) return next(ApiError.unauthorized(otpResult.reason));

    let parent = await Parent.findByPhone(normalizedPhone);
    if (!parent) {
      parent = await Parent.create({
        telephone: normalizedPhone,
        nom: 'Nouveau',
        prenom: 'Parent',
        langue_preferee: 'fr',
      });
    }
    if (!parent.est_actif) return next(ApiError.forbidden('Your account has been deactivated.'));

    const tokens = await TokenService.generateAuthTokens({
      id: parent.id,
      role: 'parent',
      telephone: parent.telephone,
    });

    return created(res, 'Authentication successful', {
      user: {
        id: parent.id,
        telephone: parent.telephone,
        nom: parent.nom,
        prenom: parent.prenom,
        langue_preferee: parent.langue_preferee,
        role: 'parent',
        isNewUser: parent.nom === 'Nouveau',
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiry,
      },
    });
  }),

  registerParent: catchAsync(async (req, res, next) => {
    const { nom, prenom, langue_preferee } = req.body;
    if (!nom || !prenom) return next(ApiError.badRequest('Nom and prenom are required'));

    const updatedParent = await Parent.update(req.user.id, {
      nom,
      prenom,
      langue_preferee: langue_preferee || 'fr',
    });
    if (!updatedParent) return next(ApiError.notFound('Parent not found'));

    return success(res, 200, 'Profile updated successfully', {
      user: {
        id: updatedParent.id,
        telephone: updatedParent.telephone,
        nom: updatedParent.nom,
        prenom: updatedParent.prenom,
        langue_preferee: updatedParent.langue_preferee,
        role: 'parent',
      },
    });
  }),

  // ---- PERSONNEL LOGIN ----

  personnelLogin: catchAsync(async (req, res, next) => {
    const { cin, mot_de_passe } = req.body;
    if (!cin || !mot_de_passe) return next(ApiError.badRequest('CIN and password are required'));
    if (!isValidCIN(cin)) return next(ApiError.badRequest('Invalid CIN format'));

    const personnel = await Personnel.findByCIN(cin);
    if (!personnel) return next(ApiError.unauthorized('Invalid CIN or password'));
    if (!personnel.est_actif) return next(ApiError.forbidden('Your account has been deactivated.'));

    const isPasswordValid = await bcrypt.compare(mot_de_passe, personnel.mot_de_passe);
    if (!isPasswordValid) return next(ApiError.unauthorized('Invalid CIN or password'));

    const tokens = await TokenService.generateAuthTokens({
      id: personnel.id,
      role: personnel.role,
    });

    return success(res, 200, 'Login successful', {
      user: {
        id: personnel.id,
        cin: personnel.cin,
        nom: personnel.nom,
        prenom: personnel.prenom,
        role: personnel.role,
        centre_id: personnel.centre_id,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiry,
      },
    });
  }),

  // ---- COMMON ----

  refreshToken: catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(ApiError.badRequest('Refresh token is required'));
    const tokens = await TokenService.refreshAuthTokens(refreshToken);
    return success(res, 200, 'Tokens refreshed successfully', {
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.accessTokenExpiry,
      },
    });
  }),

  logout: catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (refreshToken) await TokenService.revokeToken(refreshToken);
    return success(res, 200, 'Logged out successfully');
  }),

  logoutAll: catchAsync(async (req, res, next) => {
    await TokenService.revokeAllUserTokens(req.user.id, req.user.role);
    return success(res, 200, 'Logged out from all devices successfully');
  }),

  getMe: catchAsync(async (req, res, next) => {
    let user = null;
    if (req.user.role === 'parent') user = await Parent.findById(req.user.id);
    else user = await Personnel.findById(req.user.id);
    if (!user) return next(ApiError.notFound('User not found'));
    return success(res, 200, 'User profile retrieved', { user: { ...user, role: req.user.role } });
  }),

  changePassword: catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return next(ApiError.badRequest('Current password and new password are required'));
    if (newPassword.length < 6)
      return next(ApiError.badRequest('New password must be at least 6 characters'));
    if (req.user.role === 'parent')
      return next(ApiError.forbidden('Parents use OTP authentication'));

    const personnel = await Personnel.findByIdWithPassword(req.user.id);
    if (!personnel) return next(ApiError.notFound('User not found'));

    const isPasswordValid = await bcrypt.compare(currentPassword, personnel.mot_de_passe);
    if (!isPasswordValid) return next(ApiError.unauthorized('Current password is incorrect'));

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Personnel.update(req.user.id, { mot_de_passe: hashedPassword });
    return success(res, 200, 'Password changed successfully');
  }),
};

module.exports = AuthController;
