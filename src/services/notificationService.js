import apiClient from './apiClient';

export async function listNotifications(type) {
  const params = type ? { type } : {};
  return apiClient.get('/notifications', { params });
}

export async function markAsRead(id) {
  return apiClient.post(`/notifications/${id}/read`);
}

export async function markAllAsRead() {
  return apiClient.post('/notifications/read-all');
}

export async function deleteNotification(id) {
  return apiClient.delete(`/notifications/${id}`);
}

export async function getUnreadCount() {
  return apiClient.get('/notifications/unread-count');
}

export async function updatePreferences(prefs) {
  return apiClient.put('/notifications/preferences', prefs);
}

export async function getPreferences() {
  return apiClient.get('/notifications/preferences');
}

export async function registerPushToken(pushToken) {
  return apiClient.post('/notifications/push-token', { token: pushToken });
}