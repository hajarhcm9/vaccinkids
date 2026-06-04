import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const CACHE_PREFIX = 'cached_health_book_';

async function getAuthToken() {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('Session expirée. Reconnectez-vous.');
  return token;
}

async function fetchHealthBook(babyId) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/carnet/bebe/${babyId}/complete`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'error') {
    throw new Error(payload.message || 'Impossible de charger le carnet de santé.');
  }
  return payload.data;
}

async function fetchDelayedVaccines(babyId) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/carnet/bebe/${babyId}/retards`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'error') {
    throw new Error(payload.message || 'Impossible de charger les alertes vaccinales.');
  }
  return payload.data || [];
}

export const healthBookService = {
  getComplete: async (babyId) => {
    const cacheKey = `${CACHE_PREFIX}${babyId}`;

    try {
      const record = await fetchHealthBook(babyId);
      const cached = { record, lastSynced: new Date().toISOString() };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
      return { ...cached, isOffline: false };
    } catch (error) {
      const stored = await AsyncStorage.getItem(cacheKey);
      if (!stored) throw error;
      return { ...JSON.parse(stored), isOffline: true };
    }
  },

  getDelayed: fetchDelayedVaccines,
};
