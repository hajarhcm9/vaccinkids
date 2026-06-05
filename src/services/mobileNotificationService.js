import { httpClient } from './httpClient';

async function api(path, options = {}) {
  return httpClient.request(path, options);
}

function mapNotification(notification) {
  return {
    id: String(notification.id),
    title: notification.titre,
    message: notification.message,
    type: notification.type || 'INFO',
    channel: notification.canal,
    isRead: Boolean(notification.lu),
    createdAt: notification.created_at,
    referenceId: notification.reference_id,
    referenceType: notification.reference_type,
    raw: notification,
  };
}

export const mobileNotificationService = {
  getNotifications: async ({ unreadOnly = false, page = 1, limit = 50 } = {}) => {
    const query = `page=${page}&limit=${limit}&non_seulement=${unreadOnly}`;
    const payload = await api(`/notifications/me?${query}`);
    return {
      notifications: (payload.data || []).map(mapNotification),
      pagination: payload.pagination || {},
      lastSynced: new Date().toISOString(),
      isOffline: false,
    };
  },

  getUnreadCount: async () => {
    const payload = await api('/notifications/unread-count');
    return Number(payload.data?.count || 0);
  },

  markAsRead: async (notificationId) => {
    const payload = await api(`/notifications/${notificationId}/read`, { method: 'PATCH' });
    return mapNotification(payload.data);
  },

  markAllAsRead: async () => {
    const payload = await api('/notifications/read-all', { method: 'PATCH' });
    return Number(payload.data?.updated || 0);
  },
};
