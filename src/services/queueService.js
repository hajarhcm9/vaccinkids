import { httpClient } from './httpClient';

async function api(path, options = {}) {
  const payload = await httpClient.request(path, options);
  return payload.data;
}

export const queueService = {
  getStatus: async () => {
    const [entry, wait] = await Promise.all([
      api('/file-attente/me/position'),
      api('/file-attente/me/wait-time'),
    ]);
    return {
      entry: entry?.id ? entry : null,
      position: Number(wait?.position || 0),
      waitTimeMinutes: Number(wait?.waitTimeMinutes || 0),
      isOffline: false,
      lastSynced: new Date().toISOString(),
    };
  },

  join: async (booking) =>
    api('/file-attente', {
      method: 'POST',
      body: JSON.stringify({
        rendez_vous_id: Number(booking.id),
        bebe_id: Number(booking.babyId),
        session_id: Number(booking.sessionId),
        centre_id: Number(booking.raw.centre_id),
      }),
    }),

  leave: async (entryId) => api(`/file-attente/${entryId}/abandon`, { method: 'PATCH' }),
};
