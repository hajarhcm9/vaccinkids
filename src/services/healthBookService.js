import { httpClient } from './httpClient';

async function fetchHealthBook(babyId) {
  const payload = await httpClient.request(`/carnet/bebe/${babyId}/complete`);
  return payload.data;
}

async function fetchDelayedVaccines(babyId) {
  const payload = await httpClient.request(`/carnet/bebe/${babyId}/retards`);
  return payload.data || [];
}

export const healthBookService = {
  getComplete: async (babyId) => {
    const record = await fetchHealthBook(babyId);
    return { record, lastSynced: new Date().toISOString(), isOffline: false };
  },

  getDelayed: fetchDelayedVaccines,
};
