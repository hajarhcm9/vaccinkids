export const MOCK_SESSIONS = [
  {
    id: 's1',
    date: '2025-04-28',
    time: '09:00',
    centerName: 'Centre Es-Salaam',
    centerAddress: 'Rue Ibn Sina, Oujda',
    centerLatitude: 34.6814,
    centerLongitude: -1.9086,
    vaccine: 'Pentavalent (3ème dose)',
    totalSlots: 20,
    bookedSlots: 17,
    status: 'open',
    doctorName: 'Dr. Karim Alaoui',
  },
  {
    id: 's2',
    date: '2025-04-30',
    time: '10:30',
    centerName: 'Centre Es-Salaam',
    centerAddress: 'Rue Ibn Sina, Oujda',
    centerLatitude: 34.6814,
    centerLongitude: -1.9086,
    vaccine: 'ROR (1ère dose)',
    totalSlots: 15,
    bookedSlots: 15,
    status: 'full',
    doctorName: 'Dr. Karim Alaoui',
  },
  {
    id: 's3',
    date: '2025-05-05',
    time: '08:30',
    centerName: 'Centre Es-Salaam',
    centerAddress: 'Rue Ibn Sina, Oujda',
    centerLatitude: 34.6814,
    centerLongitude: -1.9086,
    vaccine: 'BCG',
    totalSlots: 25,
    bookedSlots: 8,
    status: 'open',
    doctorName: 'Dr. Fatima Zahra',
  },
  {
    id: 's4',
    date: '2025-05-10',
    time: '11:00',
    centerName: 'Centre Es-Salaam',
    centerAddress: 'Rue Ibn Sina, Oujda',
    centerLatitude: 34.6814,
    centerLongitude: -1.9086,
    vaccine: 'Hépatite B (2ème dose)',
    totalSlots: 20,
    bookedSlots: 19,
    status: 'open',
    doctorName: 'Dr. Fatima Zahra',
  },
  {
    id: 's5',
    date: '2025-05-15',
    time: '09:30',
    centerName: 'Centre Es-Salaam',
    centerAddress: 'Rue Ibn Sina, Oujda',
    centerLatitude: 34.6814,
    centerLongitude: -1.9086,
    vaccine: 'Pentavalent (1ère dose)',
    totalSlots: 20,
    bookedSlots: 3,
    status: 'open',
    doctorName: 'Dr. Karim Alaoui',
  },
];

export const MOCK_BOOKINGS = [
  {
    id: 'b1',
    sessionId: 's1',
    babyId: 'baby_1',
    babyName: 'Youssef Benali',
    status: 'confirmed',
    queueNumber: 12,
    bookedAt: '2025-04-20T10:00:00Z',
  },
];

export const sessionService = {
  getSessions: async () => {
    try {
      // TODO: Remplacer par appel API réel
      // const token = await AsyncStorage.getItem('authToken');
      // const response = await fetch(`${API_BASE_URL}/sessions`, {
      //   headers: { 'Authorization': `Bearer ${token}` },
      // });
      // return await response.json();

      await new Promise((r) => setTimeout(r, 700));
      return { success: true, sessions: MOCK_SESSIONS };
    } catch (error) {
      throw new Error('Impossible de charger les sessions.');
    }
  },

  getSessionById: async (sessionId) => {
    await new Promise((r) => setTimeout(r, 400));
    const session = MOCK_SESSIONS.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session introuvable.');
    return { success: true, session };
  },

  bookSession: async (sessionId, babyId, babyName) => {
    // TODO: Remplacer par appel API réel
    // const token = await AsyncStorage.getItem('authToken');
    // const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/book`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`,
    //   },
    //   body: JSON.stringify({ babyId }),
    // });
    // return await response.json();

    await new Promise((r) => setTimeout(r, 900));
    const session = MOCK_SESSIONS.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session introuvable.');
    if (session.bookedSlots >= session.totalSlots) {
      throw new Error('Cette session est complète.');
    }
    session.bookedSlots += 1;
    const booking = {
      id: `b_${Date.now()}`,
      sessionId,
      babyId,
      babyName,
      status: 'confirmed',
      queueNumber: session.bookedSlots,
      bookedAt: new Date().toISOString(),
    };
    MOCK_BOOKINGS.push(booking);
    return { success: true, booking };
  },

  joinWaitlist: async (sessionId, babyId, babyName) => {
    try {
      await new Promise((r) => setTimeout(r, 700));
      const booking = {
        id: `w_${Date.now()}`,
        sessionId,
        babyId,
        babyName,
        status: 'waitlist',
        waitlistPosition: Math.floor(Math.random() * 5) + 1,
        bookedAt: new Date().toISOString(),
      };
      MOCK_BOOKINGS.push(booking);
      return { success: true, booking };
    } catch (error) {
      throw new Error("Impossible de rejoindre la liste d'attente.");
    }
  },

  cancelBooking: async (bookingId) => {
    try {
      // TODO: Remplacer par appel API réel
      // const token = await AsyncStorage.getItem('authToken');
      // const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      //   method: 'DELETE',
      //   headers: { 'Authorization': `Bearer ${token}` },
      // });
      // return await response.json();

      await new Promise((r) => setTimeout(r, 600));
      const idx = MOCK_BOOKINGS.findIndex((b) => b.id === bookingId);
      if (idx !== -1) MOCK_BOOKINGS[idx].status = 'cancelled';
      return { success: true };
    } catch (error) {
      throw new Error("Impossible d'annuler la réservation.");
    }
  },

  getMyBookings: async () => {
    try {
      await new Promise((r) => setTimeout(r, 500));
      return { success: true, bookings: MOCK_BOOKINGS };
    } catch (error) {
      throw new Error('Impossible de charger vos réservations.');
    }
  },

  pollSessionFill: async (sessionId) => {
    await new Promise((r) => setTimeout(r, 300));
    const session = MOCK_SESSIONS.find((s) => s.id === sessionId);
    if (!session) return null;
    const delta = Math.random() > 0.7 ? 1 : 0;
    if (session.bookedSlots + delta <= session.totalSlots) {
      session.bookedSlots += delta;
    }
    return {
      sessionId,
      bookedSlots: session.bookedSlots,
      totalSlots: session.totalSlots,
      fillPercent: Math.round((session.bookedSlots / session.totalSlots) * 100),
      status: session.bookedSlots >= session.totalSlots ? 'full' : 'open',
    };
  },
};
