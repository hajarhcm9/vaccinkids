import apiClient from './apiClient';

export async function login(cin, password) {
  return apiClient.post('/auth/login', { cin, password });
}

export async function register(payload) {
  return apiClient.post('/auth/register', payload);
}

export async function verifyOTP(cin, code) {
  return apiClient.post('/auth/verify-otp', { cin, code });
}

export async function resendOTP(cin) {
  return apiClient.post('/auth/resend-otp', { cin });
}

export async function completeProfile(payload) {
  return apiClient.post('/auth/complete-profile', payload);
}

export async function logout() {
  return apiClient.post('/auth/logout');
}

export async function forgotPassword(cin) {
  return apiClient.post('/auth/forgot-password', { cin });
}

export async function resetPassword({ cin, otp, password }) {
  return apiClient.post('/auth/reset-password', { cin, otp, password });
}

export async function getMe() {
  return apiClient.get('/auth/me');
}

export async function updateProfile(payload) {
  return apiClient.put('/auth/profile', payload);
}

export async function updateProfilePhoto(photoUri) {
  const formData = new FormData();
  formData.append('photo', { uri: photoUri, type: 'image/jpeg', name: 'profile.jpg' });
  return apiClient.put('/auth/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
