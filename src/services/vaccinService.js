import apiClient from './apiClient';

export async function getCalendrierEnfant(enfantId) {
  const data = await apiClient.get(`/carnet/bebe/${enfantId}/complete`);

  const done = (data?.vaccinations || []).map((v) => ({
    id: `done_${v.id}`,
    nom: v.vaccin_nom || `Vaccin #${v.vaccin_id}`,
    statut: 'FAIT',
    date_prevue: v.date_session,
    dose: v.dose || null,
  }));

  const delayed = (data?.delayed_vaccines || []).map((v) => ({
    id: `late_${v.vaccin_nom}`,
    nom: v.vaccin_nom,
    statut: 'EN_RETARD',
    date_prevue: null,
    dose: null,
  }));

  const upcoming = (data?.upcoming_appointments || []).map((r) => ({
    id: `rdv_${r.id}`,
    nom: r.vaccin_nom,
    statut: 'A_VENIR',
    date_prevue: r.date_session,
    dose: null,
  }));

  return [...done, ...delayed, ...upcoming].sort((a, b) => {
    if (!a.date_prevue && !b.date_prevue) return 0;
    if (!a.date_prevue) return 1;
    if (!b.date_prevue) return -1;
    return new Date(a.date_prevue) - new Date(b.date_prevue);
  });
}

export async function getVaccinDetail(vaccinId) {
  return apiClient.get(`/vaccins/${vaccinId}`);
}
