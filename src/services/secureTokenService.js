import * as Keychain from 'react-native-keychain';

const TOKEN_SERVICE = 'vaccinkids.parent.tokens';

export const secureTokenService = {
  saveSession: async ({ accessToken, refreshToken, user }) => {
    if (!accessToken || !refreshToken) {
      throw new Error('Session incomplete.');
    }
    await Keychain.setGenericPassword(
      'parent',
      JSON.stringify({ accessToken, refreshToken, user: user || null }),
      {
        service: TOKEN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  },

  getSession: async () => {
    const credentials = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
    if (!credentials) return null;
    try {
      return JSON.parse(credentials.password);
    } catch {
      await secureTokenService.clearSession();
      return null;
    }
  },

  getAccessToken: async () => {
    const session = await secureTokenService.getSession();
    return session?.accessToken || null;
  },

  getRefreshToken: async () => {
    const session = await secureTokenService.getSession();
    return session?.refreshToken || null;
  },

  clearSession: async () => {
    await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
  },
};
