'use strict';

/**
 * Password Strength Validation Middleware
 * Enforces strong password policies on registration and password change
 */

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password is required'],
    };
  }

  const errors = [];

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (
    PASSWORD_REQUIREMENTS.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password',
    'Password1!',
    '12345678',
    'qwerty123',
    'admin123',
    'Admin123!',
    'letmein1',
    'welcome1',
  ];
  if (commonPasswords.some((cp) => password.toLowerCase() === cp.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Password strength check middleware
 * Only validates when a password field is present in the body
 * Skips for login, refresh, logout routes
 */
const passwordStrengthCheck = (req, res, next) => {
  // Skip for login, refresh, logout - these don't set new passwords
  const path = req.path || '';
  if (
    path.includes('/login') ||
    path.includes('/refresh') ||
    path.includes('/logout') ||
    path.includes('/send-otp') ||
    path.includes('/verify-otp') ||
    path.includes('/me')
  ) {
    return next();
  }

  const { mot_de_passe, nouveau_mot_de_passe, newPassword, new_password } = req.body;
  // Check for the new password being set (not the old one being verified)
  const password = nouveau_mot_de_passe || newPassword || new_password || mot_de_passe;

  if (!password) {
    return next();
  }

  const validation = validatePasswordStrength(password);

  if (!validation.isValid) {
    return res.status(400).json({
      status: 'error',
      message: 'Password does not meet security requirements',
      errors: validation.errors,
    });
  }

  return next();
};

/**
 * Calculate password strength score (0-100)
 */
const getPasswordStrengthScore = (password) => {
  if (!password) return 0;

  let score = 0;
  score += Math.min(25, password.length * 2);
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score += 15;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 5;
  const uniqueChars = new Set(password.split('')).size;
  score += Math.min(25, uniqueChars * 2);

  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.some((cp) => password.toLowerCase().includes(cp))) {
    score -= 30;
  }
  if (/(?:abc|bcd|cde|def|efg|123|234|345|456|567|678|789)/i.test(password)) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
};

module.exports = {
  passwordStrengthCheck,
  validatePasswordStrength,
  getPasswordStrengthScore,
  PASSWORD_REQUIREMENTS,
};
