import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const CACHE_KEY = 'cached_notifications';

async function getAuthToken() {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('Session expirée. Reconnectez-vous.');
  return token;
}

async function api(path, options = {}) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'error') {
    throw new Error(payload.message || 'Impossible de charger les notifications.');
  }
  return payload;
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
    const cacheKey = `${CACHE_KEY}_${unreadOnly ? 'unread' : 'all'}`;
    const query = `page=${page}&limit=${limit}&non_seulement=${unreadOnly}`;

    try {
      const payload = await api(`/notifications/me?${query}`);
      const result = {
        notifications: (payload.data || []).map(mapNotification),
        pagination: payload.pagination || {},
        lastSynced: new Date().toISOString(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
      return { ...result, isOffline: false };
    } catch (error) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) throw error;
      const result = JSON.parse(cached);
      return { ...result, isOffline: true };
    }
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
