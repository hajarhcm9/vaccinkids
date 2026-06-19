import apiClient from './apiClient';

export async function getMyNotifications(limit = 20) {
  return apiClient.get('/notifications/me', { params: { limit } });
}

export async function listNotifications() {
  return getMyNotifications(50);
}

export async function getUnreadCount() {
  return apiClient.get('/notifications/unread-count');
}

export async function markAsRead(id) {
  return apiClient.patch(`/notifications/${id}/read`, {});
}

export async function markAllAsRead() {
  return apiClient.patch('/notifications/read-all', {});
}

export async function getPreferences() {
  return null;
}

export async function updatePreferences(_prefs) {
  return null;
}
