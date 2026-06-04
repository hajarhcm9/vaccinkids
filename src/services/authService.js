const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function parseApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Erreur serveur');
  }
  return data;
}

function unwrapAuthPayload(data) {
  const payload = data.data || data;
  const tokens = payload.tokens || {};
  return {
    success: data.status === 'success',
    token: tokens.accessToken || payload.accessToken || payload.token,
    refreshToken: tokens.refreshToken || payload.refreshToken,
    expiresIn: tokens.expiresIn,
    user: payload.user || payload.parent,
  };
}

export const authService = {
  /**
   * Envoie un OTP SMS au numéro de téléphone donné
   * @param {string} phoneNumber - Format: +212XXXXXXXXX
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  sendOtp: async (phoneNumber) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/parent/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: phoneNumber }),
      });
      const data = await parseApiResponse(response);
      if (data.data?.devOtp) {
        console.warn(`[DEV] OTP pour ${phoneNumber}: ${data.data.devOtp}`);
      }
      return { success: true, message: data.message || 'OTP envoyé avec succès' };
    } catch (error) {
      console.error('sendOtp error:', error);
      throw new Error("Impossible d'envoyer le code. Réessayez.");
    }
  },

  /**
   * Vérifie le code OTP entré par l'utilisateur
   * @param {string} phoneNumber
   * @param {string} otpCode
   * @returns {Promise<{ success: boolean, token: string, refreshToken: string }>}
   */
  verifyOtp: async (phoneNumber, otpCode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/parent/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: phoneNumber, code: otpCode }),
      });
      const data = await parseApiResponse(response);
      return unwrapAuthPayload(data);
    } catch (error) {
      console.error('verifyOtp error:', error);
      throw error;
    }
  },

  registerFcmToken: async (authToken, fcmToken) => {
    if (!authToken || !fcmToken) return { success: false, skipped: true };

    const response = await fetch(`${API_BASE_URL}/auth/parent/fcm-token`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcm_token: fcmToken }),
    });
    const data = await parseApiResponse(response);
    return { success: true, data: data.data };
  },
};
