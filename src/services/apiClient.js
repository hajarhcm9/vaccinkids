import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = __DEV__
  ? 'http://10.0.2.2:8080/api'
  : 'https://api.vaccinkids.ma/api';

const TOKEN_KEY = 'jwtToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/')
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error('No refresh token');
        const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { token, refreshToken: newRefresh } = refreshResponse.data;
        await AsyncStorage.setItem(TOKEN_KEY, token);
        if (newRefresh) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, 'userData']);
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