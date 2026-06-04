import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const CACHE_KEY = 'cached_parent_queue';

async function api(path, options = {}) {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('Session expirée. Reconnectez-vous.');

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
    throw new Error(payload.message || "Impossible d'accéder à la file d'attente.");
  }
  return payload.data;
}

export const queueService = {
  getStatus: async () => {
    try {
      const [entry, wait] = await Promise.all([
        api('/file-attente/me/position'),
        api('/file-attente/me/wait-time'),
      ]);
      const status = {
        entry: entry?.id ? entry : null,
        position: Number(wait?.position || 0),
        waitTimeMinutes: Number(wait?.waitTimeMinutes || 0),
        isOffline: false,
        lastSynced: new Date().toISOString(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(status));
      return status;
    } catch (error) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) throw error;
      return { ...JSON.parse(cached), isOffline: true };
    }
  },

  join: async (booking) =>
    api('/file-attente', {
      method: 'POST',
      body: JSON.stringify({
        rendez_vous_id: Number(booking.id),
        bebe_id: Number(booking.babyId),
        session_id: Number(booking.sessionId),
        centre_id: Number(booking.raw.centre_id),
      }),
    }),

  leave: async (entryId) => api(`/file-attente/${entryId}/abandon`, { method: 'PATCH' }),
};
