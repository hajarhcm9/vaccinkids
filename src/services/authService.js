import apiClient from './apiClient';

export async function sendOTP(telephone) {
  return apiClient.post('/auth/parent/send-otp', { telephone });
}

export async function verifyOTP(telephone, code) {
  return apiClient.post('/auth/parent/verify-otp', { telephone, code });
}

export async function loginWithCIN(telephone, cin) {
  return apiClient.post('/auth/parent/login-cin', { telephone, cin });
}

export async function completeProfile({ nom, prenom, cin, email, centre_id, langue_preferee = 'fr' }) {
  return apiClient.post('/auth/parent/register', { nom, prenom, cin, email, centre_id, langue_preferee });
}

export async function listPublicCentres() {
  return apiClient.get('/guest-rdv/centres');
}

export async function updateProfile({ nom, prenom, email, langue_preferee = 'fr', centre_id } = {}) {
  return apiClient.patch('/auth/parent/profile', { nom, prenom, email, langue_preferee, centre_id });
}

export async function listGuestSessions({ newborn = false, centre_id } = {}) {
  const params = new URLSearchParams();
  if (newborn)   params.append('newborn', 'true');
  if (centre_id) params.append('centre_id', centre_id);
  const qs = params.toString();
  return apiClient.get(`/guest-rdv/sessions${qs ? `?${qs}` : ''}`);
}

export async function createGuestRdv(data) {
  return apiClient.post('/guest-rdv', data);
}

export async function logout() {
  return apiClient.post('/auth/logout');
}

export async function getMe() {
  return apiClient.get('/auth/me');
}

export async function uploadPhoto(uri) {
  const ext = uri.split('.').pop().toLowerCase().replace(/\?.*$/, '') || 'jpg';
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const formData = new FormData();
  formData.append('photo', { uri, name: `avatar.${ext}`, type });
  return apiClient.post('/auth/parent/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function updateFcmToken(fcm_token) {
  return apiClient.put('/auth/parent/fcm-token', { fcm_token });
}

export async function removeFcmToken() {
  return apiClient.delete('/auth/parent/fcm-token');
}
