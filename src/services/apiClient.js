import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SERVER_BASE_URL = process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api$/, '')
  : __DEV__
    ? 'http://192.168.1.6:3000'   // IP LAN du serveur — changer si nécessaire
    : 'https://api.vaccinkids.ma';

const BASE_URL = `${SERVER_BASE_URL}/api`;

if (__DEV__) console.log('[API] BASE_URL =', BASE_URL);

const TOKEN_KEY = 'jwtToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// Allows AuthContext to register its logout function so apiClient can trigger
// navigation-to-login when a token refresh fails mid-session.
let authLogoutCallback = null;
export function setAuthLogout(cb) {
  authLogoutCallback = cb;
}

// Shared promise to deduplicate concurrent token refresh requests.
// Without this, 4 parallel API calls that all get a 401 would each try to
// refresh simultaneously — with rotating refresh tokens, 3 of the 4 would
// fail with "invalid refresh token" and log the user out unnecessarily.
let refreshPromise = null;

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    return (body !== null && body !== undefined && 'data' in body) ? body.data : body;
  },
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/')
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = (async () => {
          const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
          if (!refreshToken) throw new Error('No refresh token');
          const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const body = refreshResponse.data;
          const inner = (body !== null && body !== undefined && 'data' in body) ? body.data : body;
          const token = inner?.tokens?.accessToken || inner?.token;
          const newRefresh = inner?.tokens?.refreshToken || inner?.refreshToken;
          if (!token) throw new Error('No access token in refresh response');
          await AsyncStorage.setItem(TOKEN_KEY, token);
          if (newRefresh) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
          return token;
        })().finally(() => { refreshPromise = null; });
      }

      try {
        const token = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch {
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, 'userData']);
        authLogoutCallback?.();
        return Promise.reject(new ApiError('Session expirée. Veuillez vous reconnecter.', 401));
      }
    }
    const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Une erreur est survenue';
    const status = error.response?.status || 0;
    return Promise.reject(new ApiError(message, status, error.response?.data));
  },
);

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
  get isNetwork()   { return this.status === 0; }
  get isAuth()      { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isNotFound()  { return this.status === 404; }
  get isValidation(){ return this.status === 400 || this.status === 422; }
  get isServer()    { return this.status >= 500; }
}

export default apiClient;
