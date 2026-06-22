import apiClient from './apiClient';

export async function listRdv() {
  return apiClient.get('/rendez-vous/me');
}

export async function getRdv(id) {
  return apiClient.get(`/rendez-vous/${id}`);
}

export async function cancelRdv(id) {
  return apiClient.patch(`/rendez-vous/${id}`, { statut: 'ANNULE' });
}

export async function listSessions(params = {}) {
  return apiClient.get('/sessions', { params });
}

export async function smartMatchSessions(vaccin_id, bebe_id) {
  return apiClient.get('/sessions/smart-match', { params: { vaccin_id, bebe_id } });
}

export async function proposeSession(data) {
  return apiClient.post('/sessions/propose', data);
}

export async function listVaccins() {
  return apiClient.get('/vaccins');
}

export async function inscribeSession(sessionId, bebe_id) {
  return apiClient.post(`/sessions/${sessionId}/inscrire`, { bebe_id });
}

export async function joinWaitlist(sessionId, bebe_id) {
  return apiClient.post(`/sessions/${sessionId}/waitlist`, { bebe_id });
}
