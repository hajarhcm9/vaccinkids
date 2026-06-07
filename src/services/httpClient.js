import { API_BASE_URL } from '../config/mobileApi';
import { accountCacheService } from './accountCacheService';
import { secureTokenService } from './secureTokenService';

const REQUEST_TIMEOUT_MS = 15_000;
let refreshPromise = null;
let sessionExpiredHandler = null;

function requestId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function parseApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === 'error') {
    const error = new Error(data.message || 'Erreur serveur');
    error.status = response.status;
    error.requestId = response.headers?.get?.('x-request-id') || null;
    error.retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw error;
  }
  return data;
}

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Le serveur met trop de temps à répondre. Réessayez.');
      timeoutError.retryable = true;
      throw timeoutError;
    }
    const networkError = new Error('Connexion impossible. Vérifiez votre réseau puis réessayez.');
    networkError.retryable = true;
    throw networkError;
  } finally {
    clearTimeout(timeout);
  }
}

async function publicRequest(path, options = {}) {
  const response = await fetchWithTimeout(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-ID': requestId(),
      ...options.headers,
    },
  });
  return parseApiResponse(response);
}

async function expireLocalSession() {
  await secureTokenService.clearSession();
  await accountCacheService.purge();
  sessionExpiredHandler?.();
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await secureTokenService.getRefreshToken();
      if (!refreshToken) throw new Error('Session expirée. Reconnectez-vous.');
      const payload = await publicRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      const tokens = payload.data?.tokens || payload.data || {};
      const previous = await secureTokenService.getSession();
      await secureTokenService.saveSession({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: previous?.user,
      });
      return tokens.accessToken;
    })()
      .catch(async (error) => {
        await expireLocalSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request(path, options = {}, retry = true) {
  const token = await secureTokenService.getAccessToken();
  if (!token) {
    await expireLocalSession();
    throw new Error('Session expirée. Reconnectez-vous.');
  }

  const method = options.method || 'GET';
  const idempotencyKey =
    options.idempotencyKey ||
    (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? requestId() : undefined);
  const response = await fetchWithTimeout(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Request-ID': requestId(),
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && retry) {
    await refreshAccessToken();
    return request(path, { ...options, idempotencyKey }, false);
  }
  return parseApiResponse(response);
}

export const httpClient = {
  request,
  publicRequest,

  onSessionExpired: (handler) => {
    sessionExpiredHandler = handler;
    return () => {
      if (sessionExpiredHandler === handler) sessionExpiredHandler = null;
    };
  },

  validateSession: async () => {
    const payload = await request('/auth/me', {}, true);
    const user = payload.data?.user || payload.data;
    const session = await secureTokenService.getSession();
    if (!user?.id || !session?.user?.id || Number(user.id) !== Number(session.user.id)) {
      await expireLocalSession();
      throw new Error('La session ne correspond pas à ce compte.');
    }
    return user;
  },

  logout: async () => {
    const refreshToken = await secureTokenService.getRefreshToken();
    try {
      if (refreshToken) {
        await request(
          '/auth/logout',
          { method: 'POST', body: JSON.stringify({ refreshToken }) },
          false,
        );
      }
    } finally {
      await expireLocalSession();
    }
  },
};
