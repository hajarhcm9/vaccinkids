const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const { checkAccountLock } = require('../middleware/bruteForceProtection');
const { passwordStrengthCheck } = require('../middleware/passwordStrengthMiddleware');

// PUBLIC
router.post('/parent/send-otp', validate(schemas.sendOTP), AuthController.sendOTP);
router.post('/parent/verify-otp', validate(schemas.verifyOTP), AuthController.verifyOTP);
router.post(
  '/personnel/login',
  checkAccountLock,
  validate(schemas.personnelLogin),
  AuthController.personnelLogin,
);
router.post('/refresh', AuthController.refreshToken);

// PROTECTED
router.post(
  '/parent/register',
  authenticate,
  passwordStrengthCheck,
  validate(schemas.registerParent),
  AuthController.registerParent,
);
router.put(
  '/parent/fcm-token',
  authenticate,
  validate(schemas.updateFcmToken),
  AuthController.updateFcmToken,
);
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
