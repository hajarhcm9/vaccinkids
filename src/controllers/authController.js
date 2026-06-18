const bcrypt = require('bcrypt');
const config = require('../config');
const { handleFailedLogin, handleSuccessfulLogin } = require('../middleware/bruteForceProtection');
const OtpService = require('../services/otpService');
const SmsService = require('../services/smsService');
const TokenService = require('../services/tokenService');
const Parent = require('../models/Parent');
const Personnel = require('../models/Personnel');
const { getClient } = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { isValidMoroccanPhone, normalizePhone, isValidCIN } = require('../utils/validator');
const { success, created } = require('../utils/responseHandler');
const { parseCookies, cookieOptions, createCsrfToken } = require('../utils/cookies');

const WEB_REFRESH_COOKIE = 'vk_admin_refresh';
const WEB_CSRF_COOKIE = 'vk_admin_csrf';
const WEB_COOKIE_PATH = '/api/auth/web-admin';
const webSessionMaxAge = () => config.surfaces.webAdminSessionDays * 24 * 60 * 60 * 1000;

const setWebAdminCookies = (res, refreshToken) => {
  const csrfToken = createCsrfToken();
  res.cookie(
    WEB_REFRESH_COOKIE,
    refreshToken,
    cookieOptions({ httpOnly: true, maxAge: webSessionMaxAge(), path: WEB_COOKIE_PATH }),
  );
  res.cookie(
    WEB_CSRF_COOKIE,
    csrfToken,
    cookieOptions({ maxAge: webSessionMaxAge(), path: WEB_COOKIE_PATH }),
  );
  return csrfToken;
};

const clearWebAdminCookies = (res) => {
  res.clearCookie(WEB_REFRESH_COOKIE, cookieOptions({ httpOnly: true, path: WEB_COOKIE_PATH }));
  res.clearCookie(WEB_CSRF_COOKIE, cookieOptions({ path: WEB_COOKIE_PATH }));
};

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
    if (!smsResult.success) {
      await OtpService.invalidate(otpResult.id);
      return next(ApiError.serviceUnavailable('OTP delivery is temporarily unavailable'));
    }

    const responseData = {
      telephone: normalizedPhone,
      expiryMinutes: otpResult.expiryMinutes,
      otpSent: smsResult.success,
      mode: smsResult.mode,
    };
    if (config.isDev || config.isTest) responseData.devOtp = otpResult.otp;

    return success(res, 200, 'OTP code sent successfully', responseData);
  }),

  verifyOTP: catchAsync(async (req, res, next) => {
    const { telephone, code } = req.body;
    if (!telephone || !code)
      return next(ApiError.badRequest('Phone number and OTP code are required'));

    const normalizedPhone = normalizePhone(telephone);
    const client = await getClient();
    let transactionClosed = false;

    try {
      await client.query('BEGIN');
      const otpResult = await OtpService.verifyOTP(normalizedPhone, code, { client });
      if (!otpResult.valid) {
        await client.query('COMMIT');
        transactionClosed = true;
        return next(ApiError.unauthorized(otpResult.reason));
      }

      const parent = await Parent.upsertByPhone(
        {
          telephone: normalizedPhone,
          nom: 'Nouveau',
          prenom: 'Parent',
          langue_preferee: 'fr',
        },
        client,
      );
      if (!parent.est_actif) {
        await client.query('ROLLBACK');
        transactionClosed = true;
        return next(ApiError.forbidden('Your account has been deactivated.'));
      }

      const tokens = await TokenService.generateAuthTokens(
        {
          id: parent.id,
          role: 'parent',
          telephone: parent.telephone,
        },
        { client },
      );

      await client.query('COMMIT');
      transactionClosed = true;
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
    } catch (error) {
      if (!transactionClosed) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  updateFcmToken: catchAsync(async (req, res, next) => {
    if (req.user.role !== 'parent')
      return next(ApiError.forbidden('Only parents can register FCM tokens'));

    const updated = await Parent.updateFcmToken(req.user.id, req.body.fcm_token);
    if (!updated) return next(ApiError.notFound('Parent not found'));

    return success(res, 200, 'FCM token registered successfully', {
      parent_id: updated.id,
      push_enabled: Boolean(updated.fcm_token),
    });
  }),

  removeFcmToken: catchAsync(async (req, res, next) => {
    if (req.user.role !== 'parent')
      return next(ApiError.forbidden('Only parents can remove FCM tokens'));
    await Parent.updateFcmToken(req.user.id, null);
    return success(res, 200, 'FCM token removed successfully', { push_enabled: false });
  }),

  // ---- PERSONNEL LOGIN ----

  personnelLogin: catchAsync(async (req, res, next) => {
    const { cin, mot_de_passe } = req.body;
    if (!cin || !mot_de_passe) return next(ApiError.badRequest('CIN and password are required'));
    if (!isValidCIN(cin)) return next(ApiError.badRequest('Invalid CIN format'));

    const personnel = await Personnel.findByCIN(cin);
    if (!personnel) {
      await handleFailedLogin(cin);
      return next(ApiError.unauthorized('Invalid CIN or password'));
    }
    if (!personnel.est_actif) return next(ApiError.forbidden('Your account has been deactivated.'));

    const isPasswordValid = await bcrypt.compare(mot_de_passe, personnel.mot_de_passe);
    if (!isPasswordValid) {
      await handleFailedLogin(cin);
      return next(ApiError.unauthorized('Invalid CIN or password'));
    }

    const tokens = await TokenService.generateAuthTokens({
      id: personnel.id,
      role: personnel.role,
    });

    await handleSuccessfulLogin(cin);
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

  webAdminLogin: catchAsync(async (req, res, next) => {
    const { cin, mot_de_passe } = req.body;
    if (!cin || !mot_de_passe) return next(ApiError.badRequest('CIN and password are required'));
    const personnel = await Personnel.findByCIN(cin);
    if (!personnel || !(await bcrypt.compare(mot_de_passe, personnel.mot_de_passe))) {
      await handleFailedLogin(cin);
      return next(ApiError.unauthorized('Invalid admin credentials'));
    }
    if (personnel.role !== 'admin' || !personnel.est_actif) {
      return next(ApiError.forbidden('Active admin account required'));
    }
    await handleSuccessfulLogin(cin);
    const tokens = await TokenService.generateAuthTokens(
      { id: personnel.id, role: 'admin' },
      { sessionType: 'web-admin', refreshExpiresIn: `${config.surfaces.webAdminSessionDays}d` },
    );
    const csrfToken = setWebAdminCookies(res, tokens.refreshToken);
    return success(res, 200, 'Web admin login successful', {
      accessToken: tokens.accessToken,
      expiresIn: tokens.accessTokenExpiry,
      csrfToken,
    });
  }),

  webAdminRefresh: catchAsync(async (req, res, next) => {
    const refreshToken = parseCookies(req.headers.cookie)[WEB_REFRESH_COOKIE];
    if (!refreshToken) return next(ApiError.unauthorized('Web admin session expired'));
    const refreshIdentity = TokenService.verifyRefreshToken(refreshToken);
    req.user = { id: refreshIdentity.userId, role: refreshIdentity.role };
    const admin = await Personnel.findById(refreshIdentity.userId);
    if (refreshIdentity.role !== 'admin' || !admin || !admin.est_actif || admin.role !== 'admin') {
      await TokenService.revokeToken(refreshToken);
      clearWebAdminCookies(res);
      return next(ApiError.forbidden('Active admin session required'));
    }
    const tokens = await TokenService.refreshAuthTokens(refreshToken);
    const csrfToken = setWebAdminCookies(res, tokens.refreshToken);
    return success(res, 200, 'Web admin session refreshed', {
      accessToken: tokens.accessToken,
      expiresIn: tokens.accessTokenExpiry,
      csrfToken,
    });
  }),

  webAdminLogout: catchAsync(async (req, res) => {
    const refreshToken = parseCookies(req.headers.cookie)[WEB_REFRESH_COOKIE];
    if (refreshToken) await TokenService.revokeToken(refreshToken);
    clearWebAdminCookies(res);
    return success(res, 200, 'Web admin logged out');
  }),

  // ---- COMMON ----

  refreshToken: catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(ApiError.badRequest('Refresh token is required'));
    const refreshIdentity = TokenService.verifyRefreshToken(refreshToken);
    req.user = { id: refreshIdentity.userId, role: refreshIdentity.role };
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

  updateProfile: catchAsync(async (req, res, next) => {
    if (req.user.role !== 'parent')
      return next(ApiError.forbidden('Only parents can update their profile this way'));
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
    await TokenService.revokeAllUserTokens(req.user.id, req.user.role);
    return success(res, 200, 'Password changed successfully');
  }),
};

module.exports = AuthController;
