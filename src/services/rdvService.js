import apiClient from './apiClient';

export async function listRdv(statut) {
  const params = statut ? { statut } : {};
  return apiClient.get('/rdv', { params });
}

export async function getRdv(id) {
  return apiClient.get(`/rdv/${id}`);
}

export async function takeRdv(payload) {
  return apiClient.post('/rdv', payload);
}

export async function getCreneaux({ centre_id, vaccin, from, to }) {
  return apiClient.get('/rdv/creneaux', { params: { centre_id, vaccin, from, to } });
}

export async function cancelRdv(id, motif) {
  return apiClient.post(`/rdv/${id}/cancel`, { motif });
}

export async function rescheduleRdv(id, { date, heure }) {
  return apiClient.post(`/rdv/${id}/reschedule`, { date, heure });
}

export async function markAsDone(id) {
  return apiClient.post(`/rdv/${id}/done`);
}

export async function listCentres() {
  return apiClient.get('/centres');
}