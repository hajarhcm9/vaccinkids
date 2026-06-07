import { httpClient } from './httpClient';

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
  sendOtp: async (phoneNumber) => {
    const data = await httpClient.publicRequest('/auth/parent/send-otp', {
      method: 'POST',
      body: JSON.stringify({ telephone: phoneNumber }),
    });
    return { success: true, message: data.message || 'OTP envoyé avec succès' };
  },

  verifyOtp: async (phoneNumber, otpCode) => {
    const data = await httpClient.publicRequest('/auth/parent/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ telephone: phoneNumber, code: otpCode }),
    });
    return unwrapAuthPayload(data);
  },

  registerFcmToken: async (authToken, fcmToken) => {
    if (!authToken) return { success: false, skipped: true };
    const payload = await httpClient.request('/auth/parent/fcm-token', {
      method: fcmToken ? 'PUT' : 'DELETE',
      body: fcmToken ? JSON.stringify({ fcm_token: fcmToken }) : undefined,
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return { success: true, data: payload.data };
  },
};
