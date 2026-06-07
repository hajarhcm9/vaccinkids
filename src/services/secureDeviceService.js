import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const DEVICE_SERVICE = 'vaccinikids.parent.device';
const LEGACY_FCM_KEY = 'fcmToken';

export const secureDeviceService = {
  saveMessagingToken: async (token) => {
    if (!token) return;
    await Keychain.setGenericPassword('device', token, {
      service: DEVICE_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(LEGACY_FCM_KEY);
  },

  getMessagingToken: async () => {
    const credentials = await Keychain.getGenericPassword({ service: DEVICE_SERVICE });
    if (credentials) return credentials.password;

    const legacyToken = await AsyncStorage.getItem(LEGACY_FCM_KEY);
    if (legacyToken) {
      await secureDeviceService.saveMessagingToken(legacyToken);
      return legacyToken;
    }
    return null;
  },

  clearMessagingToken: async () => {
    await Keychain.resetGenericPassword({ service: DEVICE_SERVICE });
    await AsyncStorage.removeItem(LEGACY_FCM_KEY);
  },
};
