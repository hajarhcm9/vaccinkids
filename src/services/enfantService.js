import apiClient from './apiClient';

export async function listEnfants() {
  return apiClient.get('/carnet/bebes');
}

export async function getEnfant(id) {
  return apiClient.get(`/carnet/bebe/${id}`);
}

export async function addEnfant(payload) {
  return apiClient.post('/carnet/bebe', payload);
}

export async function getEnfantComplete(id) {
  return apiClient.get(`/carnet/bebe/${id}/complete`);
}

export async function updateEnfant(id, data) {
  return apiClient.patch(`/carnet/bebe/${id}`, data);
}
