/**
 * Notification validation schemas.
 * Uses the project's custom validation format (not Joi).
 * Merged into main schemas in notificationRoutes.js via Object.assign.
 */
module.exports = {
  notificationSend: {
    destinataire_id: {
      type: 'integer',
      required: true,
    },
    destinataire_type: {
      type: 'string',
      enum: ['parent', 'personnel'],
      default: 'parent',
    },
    type: {
      type: 'string',
      required: true,
      enum: ['RAPPEL_RDV', 'ABSENCE', 'ALERTE_STOCK', 'CONFIRMATION', 'INFO'],
    },
    canal: {
      type: 'string',
      enum: ['sms', 'email', 'push', 'in_app'],
      default: 'in_app',
    },
    titre: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 255,
    },
    message: {
      type: 'string',
      required: true,
      minLength: 1,
    },
    reference_id: {
      type: 'integer',
    },
    reference_type: {
      type: 'string',
      enum: ['rendez_vous', 'flacon', 'stock', 'session'],
    },
  },
};
