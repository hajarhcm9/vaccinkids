import apiClient from './apiClient';

export async function listNotifications() {
  return apiClient.get('/notifications/me');
}

export async function markAsRead(id) {
  return apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead() {
  return apiClient.patch('/notifications/read-all');
}

export async function deleteNotification(id) {
  return apiClient.delete(`/notifications/${id}`);
}

export async function getUnreadCount() {
  return apiClient.get('/notifications/unread-count');
}

export async function getPreferences() {
  return null;
}

export async function updatePreferences() {
  return null;
}
