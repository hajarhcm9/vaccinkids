const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Mock OTP store (remplacer par appel API réel)
const mockOtpStore = {};

export const authService = {
  /**
   * Envoie un OTP SMS au numéro de téléphone donné
   * @param {string} phoneNumber - Format: +212XXXXXXXXX
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  sendOtp: async (phoneNumber) => {
    try {
      // TODO: Remplacer par appel API réel
      // const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber }),
      // });
      // return await response.json();

      // MOCK: Génère un OTP à 6 chiffres pour les tests
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      mockOtpStore[phoneNumber] = {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };
      console.log(`[DEV] OTP pour ${phoneNumber}: ${otp}`);

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simule latence réseau
      return { success: true, message: 'OTP envoyé avec succès' };
    } catch (error) {
      console.error('sendOtp error:', error);
      throw new Error('Impossible d\'envoyer le code. Réessayez.');
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
      // TODO: Remplacer par appel API réel
      // const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber, otpCode }),
      // });
      // return await response.json();

      // MOCK
      await new Promise((resolve) => setTimeout(resolve, 800));
      const stored = mockOtpStore[phoneNumber];

      if (!stored) {
        throw new Error('Aucun OTP envoyé pour ce numéro.');
      }
      if (Date.now() > stored.expiresAt) {
        throw new Error('Le code OTP a expiré. Demandez un nouveau code.');
      }
      if (stored.code !== otpCode) {
        throw new Error('Code incorrect. Vérifiez et réessayez.');
      }

      // Nettoyage après vérification
      delete mockOtpStore[phoneNumber];

      return {
        success: true,
        token: `mock_jwt_token_${Date.now()}`,
        refreshToken: `mock_refresh_token_${Date.now()}`,
        user: { phoneNumber, isNewUser: true },
      };
    } catch (error) {
      console.error('verifyOtp error:', error);
      throw error;
    }
  },
};