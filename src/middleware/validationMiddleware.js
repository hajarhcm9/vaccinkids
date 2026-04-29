const ApiError = require('../utils/ApiError');

const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const sanitizedBody = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (value === undefined || value === null) {
        if (rules.default !== undefined) sanitizedBody[field] = rules.default;
        continue;
      }

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push({ field, message: `${field} must be a string` });
        continue;
      }
      if (rules.type === 'integer' && !Number.isInteger(value)) {
        errors.push({ field, message: `${field} must be an integer` });
        continue;
      }

      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength)
          errors.push({
            field,
            message: `${field} must be at least ${rules.minLength} characters`,
          });
        if (rules.maxLength && value.length > rules.maxLength)
          errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
        if (rules.pattern && !rules.pattern.test(value))
          errors.push({ field, message: rules.patternMessage || `${field} format is invalid` });
        if (rules.enum && !rules.enum.includes(value))
          errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }

      if (rules.type === 'integer') {
        if (rules.min !== undefined && value < rules.min)
          errors.push({ field, message: `${field} must be at least ${rules.min}` });
        if (rules.max !== undefined && value > rules.max)
          errors.push({ field, message: `${field} must be at most ${rules.max}` });
      }

      sanitizedBody[field] = value;
    }

    if (errors.length > 0) return next(ApiError.badRequest('Validation failed', errors));
    req.body = sanitizedBody;
    return next();
  };
};

const schemas = {
  sendOTP: {
    telephone: {
      type: 'string',
      required: true,
      pattern: /^(\+212|0)[5-7]\d{8}$/,
      patternMessage: 'Invalid Moroccan phone number',
    },
  },
  verifyOTP: {
    telephone: { type: 'string', required: true },
    code: {
      type: 'string',
      required: true,
      minLength: 6,
      maxLength: 6,
      pattern: /^\d+$/,
      patternMessage: 'OTP must be 6 digits',
    },
  },
  registerParent: {
    nom: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    prenom: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    langue_preferee: { type: 'string', enum: ['fr', 'ar'], default: 'fr' },
  },
  personnelLogin: {
    cin: { type: 'string', required: true },
    mot_de_passe: { type: 'string', required: true, minLength: 6 },
  },
  createSession: {
    centre_id: { type: 'integer', required: true },
    vaccin_id: { type: 'integer', required: true },
    date_session: {
      type: 'string',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      patternMessage: 'Date must be YYYY-MM-DD',
    },
    heure_debut: {
      type: 'string',
      required: true,
      pattern: /^\d{2}:\d{2}$/,
      patternMessage: 'Time must be HH:MM',
    },
    heure_fin: {
      type: 'string',
      required: true,
      pattern: /^\d{2}:\d{2}$/,
      patternMessage: 'Time must be HH:MM',
    },
    max_inscriptions: { type: 'integer', required: true, min: 1, max: 100 },
  },
  addBebe: {
    prenom: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    nom: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    date_naissance: {
      type: 'string',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      patternMessage: 'Date must be YYYY-MM-DD',
    },
    sexe: { type: 'string', required: true, enum: ['M', 'F'] },
  },
  createVaccin: {
    nom: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    doses_par_flacon: { type: 'integer', required: true, min: 1 },
    age_cible_semaines: { type: 'integer', required: true, min: 0 },
    maladies_ciblees: { type: 'string', required: true },
  },
  changePassword: {
    currentPassword: { type: 'string', required: true },
    newPassword: { type: 'string', required: true, minLength: 6, maxLength: 50 },
  },
};

module.exports = { validate, schemas };
