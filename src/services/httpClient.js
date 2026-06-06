import { API_BASE_URL } from '../config/mobileApi';
import { accountCacheService } from './accountCacheService';
import { secureTokenService } from './secureTokenService';

let refreshPromise = null;

async function parseApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === 'error') {
    const error = new Error(data.message || 'Erreur serveur');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await secureTokenService.getRefreshToken();
      if (!refreshToken) throw new Error('Session expirée. Reconnectez-vous.');
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const payload = await parseApiResponse(response);
      const tokens = payload.data?.tokens || payload.data || {};
      const previous = await secureTokenService.getSession();
      await secureTokenService.saveSession({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: previous?.user,
      });
      return tokens.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request(path, options = {}, retry = true) {
  const token = await secureTokenService.getAccessToken();
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

  if (response.status === 401 && retry) {
    await refreshAccessToken();
    return request(path, options, false);
  }

  return parseApiResponse(response);
}

export const httpClient = {
  request,

  validateSession: async () => {
    const payload = await request('/auth/me', {}, false);
    return payload.data?.user || payload.data;
  },

  logout: async () => {
    const refreshToken = await secureTokenService.getRefreshToken();
    try {
      if (refreshToken) {
        await request(
          '/auth/logout',
          {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          },
          false,
        );
      }
    } finally {
      await secureTokenService.clearSession();
      await accountCacheService.purge();
    }
  },
};
