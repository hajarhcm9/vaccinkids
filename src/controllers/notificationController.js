const Notification = require('../models/Notification');
const Parent = require('../models/Parent');
const notificationService = require('../services/notificationService');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { success, created } = require('../utils/responseHandler');

const getMyNotifications = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const destinataireType = req.user.role === 'parent' ? 'parent' : 'personnel';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const nonSeulement = req.query.non_seulement === 'true';

  const result = await Notification.findByDestinataire(userId, {
    page,
    limit,
    non_seulement: nonSeulement,
    destinataire_type: destinataireType,
  });

  return res.status(200).json({
    status: 'success',
    message: 'Notifications retrieved',
    data: result.rows,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: Math.ceil(result.total / result.limit) || 0,
    },
  });
});

const getUnreadCount = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const destinataireType = req.user.role === 'parent' ? 'parent' : 'personnel';

  const count = await Notification.countUnread(userId, destinataireType);

  return success(res, 200, 'Unread count retrieved', { count });
});

const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const destinataireType = req.user.role === 'parent' ? 'parent' : 'personnel';

  const notification = await Notification.findById(id);
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (
    notification.destinataire_id !== userId ||
    notification.destinataire_type !== destinataireType
  ) {
    throw ApiError.forbidden('You can only mark your own notifications as read');
  }

  const updated = await Notification.markAsRead(id);
  return success(res, 200, 'Notification marked as read', updated);
});

const markAllRead = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const destinataireType = req.user.role === 'parent' ? 'parent' : 'personnel';

  const count = await Notification.markAllAsRead(userId, destinataireType);
  return success(res, 200, 'All notifications marked as read', { updated: count });
});

const sendManual = catchAsync(async (req, res) => {
  const { destinataire_id, type, canal, titre, message, reference_id, reference_type } = req.body;
  const destinataire_type = req.body.destinataire_type || 'parent';

  const notification = await notificationService.sendNotification({
    destinataire_id,
    type,
    canal,
    titre,
    message,
    reference_id,
    reference_type,
    destinataire_type,
  });

  return created(res, 'Notification sent successfully', notification);
});

const DEFAULT_PREFS = {
  rdvRappel: true,
  rdvConfirmation: true,
  vaccinsRetard: true,
  actualites: false,
};

const getPreferences = catchAsync(async (req, res) => {
  if (req.user.role !== 'parent') {
    return success(res, 200, 'Preferences retrieved', DEFAULT_PREFS);
  }
  const prefs = await Parent.getPreferences(req.user.id);
  return success(res, 200, 'Preferences retrieved', prefs ?? DEFAULT_PREFS);
});

const updatePreferences = catchAsync(async (req, res) => {
  const allowed = ['rdvRappel', 'rdvConfirmation', 'vaccinsRetard', 'actualites'];
  const sanitized = {};
  for (const key of allowed) {
    if (typeof req.body[key] === 'boolean') sanitized[key] = req.body[key];
  }
  if (Object.keys(sanitized).length === 0) {
    throw ApiError.validation('No valid preference fields provided');
  }
  if (req.user.role !== 'parent') {
    return success(res, 200, 'Preferences updated', { ...DEFAULT_PREFS, ...sanitized });
  }
  const current = (await Parent.getPreferences(req.user.id)) ?? DEFAULT_PREFS;
  const merged = { ...current, ...sanitized };
  const saved = await Parent.setPreferences(req.user.id, merged);
  return success(res, 200, 'Preferences updated', saved ?? merged);
});

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  sendManual,
  getPreferences,
  updatePreferences,
};
