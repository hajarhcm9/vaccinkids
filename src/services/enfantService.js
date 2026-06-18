import apiClient from './apiClient';

export async function listEnfants() {
  return apiClient.get('/enfants');
}

export async function getEnfant(id) {
  return apiClient.get(`/enfants/${id}`);
}

export async function addEnfant(payload) {
  return apiClient.post('/enfants', payload);
}

export async function updateEnfant(id, payload) {
  return apiClient.put(`/enfants/${id}`, payload);
}

export async function deleteEnfant(id) {
  return apiClient.delete(`/enfants/${id}`);
}

export async function linkEnfantByCode(codeCentre) {
  return apiClient.post('/enfants/link', { codeCentre });
}

export async function uploadPhotoEnfant(id, photoUri) {
  const formData = new FormData();
  formData.append('photo', { uri: photoUri, type: 'image/jpeg', name: `enfant-${id}.jpg` });
  return apiClient.post(`/enfants/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}