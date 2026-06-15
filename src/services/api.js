import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sur émulateur Android : 10.0.2.2
// Sur web/iOS : localhost
// Sur téléphone physique : l'IP locale de ton PC (ex: 192.168.1.20)
const API_BASE_URL = 'http://10.0.2.2:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('jwtToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;