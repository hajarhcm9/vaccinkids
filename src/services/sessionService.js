import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function parseApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Erreur serveur');
  }
  return data.data ?? data;
}

async function getAuthToken() {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('Session expirée. Reconnectez-vous.');
  return token;
}

async function api(path, options = {}) {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  return parseApiResponse(response);
}

function mapSessionStatus(session, bookedSlots, totalSlots) {
  if (bookedSlots >= totalSlots) return 'full';
  if (['EN_FORMATION', 'CONFIRMEE'].includes(session.statut)) return 'open';
  return 'closed';
}

function fromApiSession(session, availability = null) {
  const bookedSlots = Number(availability?.inscrits ?? session.inscrits ?? 0);
  const totalSlots = Number(availability?.max_inscriptions ?? session.max_inscriptions ?? 0);

  return {
    id: String(session.id),
    date: session.date_session,
    time: session.heure_debut,
    endTime: session.heure_fin,
    centerName: session.centre_nom || `Centre #${session.centre_id}`,
    centerAddress: session.centre_adresse || '',
    centerLatitude: session.centre_gps_lat,
    centerLongitude: session.centre_gps_lng,
    vaccine: session.vaccin_nom || `Vaccin #${session.vaccin_id}`,
    totalSlots,
    bookedSlots,
    status: mapSessionStatus(session, bookedSlots, totalSlots),
    rawStatus: session.statut,
    raw: session,
  };
}

function mapBookingStatus(status) {
  if (status === 'EN_LISTE_ATTENTE') return 'waitlist';
  if (['PRESENT', 'ABSENT'].includes(status)) return 'done';
  if (status === 'ANNULE') return 'cancelled';
  if (status === 'CONFIRME') return 'confirmed';
  if (status === 'EN_ATTENTE') return 'pending';
  return 'pending';
}

function fromApiBooking(booking) {
  const babyName = [booking.bebe_prenom, booking.bebe_nom].filter(Boolean).join(' ');
  return {
    id: String(booking.id),
    sessionId: String(booking.session_id),
    babyId: String(booking.bebe_id),
    babyName: babyName || 'Enfant',
    status: mapBookingStatus(booking.statut),
    queueNumber: booking.numero_attente,
    waitlistPosition: booking.position,
    bookedAt: booking.date_creation,
    session: booking.date_session
      ? fromApiSession({
          id: booking.session_id,
          date_session: booking.date_session,
          heure_debut: booking.heure_debut,
          heure_fin: booking.heure_fin,
          vaccin_nom: booking.vaccin_nom,
          centre_nom: booking.centre_nom,
          centre_adresse: booking.centre_adresse,
          centre_gps_lat: booking.centre_gps_lat,
          centre_gps_lng: booking.centre_gps_lng,
          statut: booking.session_statut,
        })
      : null,
    raw: booking,
  };
}

export const sessionService = {
  getSessions: async () => {
    const sessions = await api('/sessions');
    return { success: true, sessions: (sessions || []).map((session) => fromApiSession(session)) };
  },

  getSessionById: async (sessionId) => {
    const [session, availability] = await Promise.all([
      api(`/sessions/${sessionId}`),
      api(`/rendez-vous/session/${sessionId}/availability`),
    ]);
    return { success: true, session: fromApiSession(session, availability) };
  },

  bookSession: async (sessionId, babyId) => {
    const booking = await api('/rendez-vous', {
      method: 'POST',
      body: JSON.stringify({ session_id: Number(sessionId), bebe_id: Number(babyId) }),
    });
    return { success: true, booking: fromApiBooking(booking) };
  },

  joinWaitlist: async (sessionId, babyId) => {
    const booking = await api(`/sessions/${sessionId}/waitlist`, {
      method: 'POST',
      body: JSON.stringify({ bebe_id: Number(babyId) }),
    });
    return { success: true, booking: fromApiBooking(booking) };
  },

  cancelBooking: async (bookingId) => {
    const booking = await api(`/rendez-vous/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: 'ANNULE' }),
    });
    return { success: true, booking: fromApiBooking(booking) };
  },

  getMyBookings: async () => {
    const bookings = await api('/rendez-vous/me');
    return { success: true, bookings: (bookings || []).map(fromApiBooking) };
  },

  pollSessionFill: async (sessionId) => {
    const availability = await api(`/rendez-vous/session/${sessionId}/availability`);
    const bookedSlots = Number(availability.inscrits || 0);
    const totalSlots = Number(availability.max_inscriptions || 0);
    return {
      sessionId: String(sessionId),
      bookedSlots,
      totalSlots,
      fillPercent: totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0,
      status: availability.disponible ? 'open' : 'full',
    };
  },
};
