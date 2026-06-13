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
      if (rules.type === 'number' && typeof value !== 'number') {
        errors.push({ field, message: `${field} must be a number` });
        continue;
      }
      if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push({ field, message: `${field} must be a boolean` });
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

      if (rules.type === 'number') {
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
  updateFcmToken: {
    fcm_token: { type: 'string', required: true, minLength: 10, maxLength: 4096 },
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
  updateSession: {
    centre_id: { type: 'integer' },
    vaccin_id: { type: 'integer' },
    date_session: {
      type: 'string',
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      patternMessage: 'Date must be YYYY-MM-DD',
    },
    heure_debut: {
      type: 'string',
      pattern: /^\d{2}:\d{2}$/,
      patternMessage: 'Time must be HH:MM',
    },
    heure_fin: {
      type: 'string',
      pattern: /^\d{2}:\d{2}$/,
      patternMessage: 'Time must be HH:MM',
    },
    max_inscriptions: { type: 'integer', min: 1, max: 100 },
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
  updateVaccin: {
    nom: { type: 'string', minLength: 2, maxLength: 100 },
    doses_par_flacon: { type: 'integer', min: 1 },
    age_cible_semaines: { type: 'integer', min: 0 },
    maladies_ciblees: { type: 'string' },
    est_actif: { type: 'boolean' },
  },
  changePassword: {
    currentPassword: { type: 'string', required: true },
    newPassword: { type: 'string', required: true, minLength: 6, maxLength: 50 },
  },
  createRendezVous: {
    session_id: { type: 'integer', required: true },
    bebe_id: { type: 'integer', required: true },
  },
  updateRendezVous: {
    statut: {
      type: 'string',
      required: true,
      enum: ['EN_ATTENTE', 'CONFIRME', 'PRESENT', 'ABSENT', 'ANNULE', 'EN_LISTE_ATTENTE'],
    },
  },
  recordVaccination: {
    flacon_id: { type: 'integer', required: true },
    poids: { type: 'number', required: true, min: 0.5, max: 100 },
    taille: { type: 'number', required: true, min: 20, max: 220 },
    reactions: { type: 'string', maxLength: 1000 },
  },
  openFlacon: {
    vaccin_id: { type: 'integer', required: true },
    session_id: { type: 'integer' },
    numero_lot: { type: 'string', required: true, minLength: 1, maxLength: 50 },
    fabricant: { type: 'string', required: true, minLength: 2, maxLength: 100 },
  },
  forceCloseFlacon: {
    justification: { type: 'string', required: true, minLength: 5, maxLength: 1000 },
  },
  upsertStock: {
    centre_id: { type: 'integer', required: true },
    vaccin_id: { type: 'integer', required: true },
    quantite_disponible: { type: 'integer', required: true, min: 0 },
    seuil_alerte: { type: 'integer', min: 0 },
    motif: { type: 'string', maxLength: 500 },
  },
  updateStock: {
    quantite_disponible: { type: 'integer', min: 0 },
    seuil_alerte: { type: 'integer', min: 0 },
    motif: { type: 'string', maxLength: 500 },
  },
};

module.exports = { validate, schemas };
