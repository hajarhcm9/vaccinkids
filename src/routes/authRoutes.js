const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const { checkAccountLock } = require('../middleware/bruteForceProtection');
const { passwordStrengthCheck } = require('../middleware/passwordStrengthMiddleware');
const requireWebCsrf = require('../middleware/webCsrf');
const { requireWebAdminSurface } = require('../middleware/surfaceAvailability');
const upload = require('../middleware/upload');

// PUBLIC
router.post('/parent/send-otp', validate(schemas.sendOTP), AuthController.sendOTP);
router.post('/parent/verify-otp', validate(schemas.verifyOTP), AuthController.verifyOTP);
router.post('/parent/login-cin', AuthController.loginWithCIN);
router.post(
  '/personnel/login',
  checkAccountLock,
  validate(schemas.personnelLogin),
  AuthController.personnelLogin,
);
router.post('/refresh', AuthController.refreshToken);
router.post(
  '/web-admin/login',
  requireWebAdminSurface,
  checkAccountLock,
  AuthController.webAdminLogin,
);
router.post(
  '/web-admin/refresh',
  requireWebAdminSurface,
  requireWebCsrf,
  AuthController.webAdminRefresh,
);
router.post(
  '/web-admin/logout',
  requireWebAdminSurface,
  requireWebCsrf,
  AuthController.webAdminLogout,
);

// PROTECTED
router.post(
  '/parent/register',
  authenticate,
  passwordStrengthCheck,
  validate(schemas.registerParent),
  AuthController.registerParent,
);
router.patch(
  '/parent/profile',
  authenticate,
  validate(schemas.updateProfile),
  AuthController.updateProfile,
);
router.put(
  '/parent/fcm-token',
  authenticate,
  validate(schemas.updateFcmToken),
  AuthController.updateFcmToken,
);
router.delete('/parent/fcm-token', authenticate, AuthController.removeFcmToken);
router.post('/parent/photo', authenticate, upload.single('photo'), AuthController.uploadPhoto);
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);
router.put(
  '/change-password',
  authenticate,
  passwordStrengthCheck,
  validate(schemas.changePassword),
  AuthController.changePassword,
);

module.exports = router;
