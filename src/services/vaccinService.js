import apiClient from './apiClient';

export async function getCalendrierEnfant(enfantId) {
  return apiClient.get(`/enfants/${enfantId}/calendrier`);
}

export async function getProgressionEnfant(enfantId) {
  return apiClient.get(`/enfants/${enfantId}/calendrier/progression`);
}

export async function getVaccinDetail(vaccinId) {
  return apiClient.get(`/vaccins/${vaccinId}`);
}

export async function getCalendrierReference() {
  return apiClient.get('/vaccins/calendrier-reference');
}

export async function getHistoriqueVaccin(enfantId, vaccinNom) {
  return apiClient.get(`/enfants/${enfantId}/vaccins/${encodeURIComponent(vaccinNom)}/historique`);
}