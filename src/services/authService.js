import apiClient from './apiClient';

export async function sendOTP(telephone) {
  return apiClient.post('/auth/parent/send-otp', { telephone });
}

export async function verifyOTP(telephone, code) {
  return apiClient.post('/auth/parent/verify-otp', { telephone, code });
}

export async function completeProfile({ nom, prenom, langue_preferee = 'fr' }) {
  return apiClient.post('/auth/parent/register', { nom, prenom, langue_preferee });
}

export async function logout() {
  return apiClient.post('/auth/logout');
}

export async function getMe() {
  return apiClient.get('/auth/me');
}

export async function updateFcmToken(fcm_token) {
  return apiClient.put('/auth/parent/fcm-token', { fcm_token });
}

export async function removeFcmToken() {
  return apiClient.delete('/auth/parent/fcm-token');
}
