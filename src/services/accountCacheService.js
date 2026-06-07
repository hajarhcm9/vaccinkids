import AsyncStorage from '@react-native-async-storage/async-storage';

const SENSITIVE_PREFIXES = [
  'authToken',
  'refreshToken',
  'userPhone',
  'cached_babies',
  'cached_health_book_',
  'cached_parent_queue',
  'cached_notifications',
  'fcmToken',
];

export const accountCacheService = {
  purge: async () => {
    const keys = await AsyncStorage.getAllKeys();
    const sensitiveKeys = keys.filter((key) =>
      SENSITIVE_PREFIXES.some((prefix) => key.startsWith(prefix)),
    );
    if (sensitiveKeys.length > 0) {
      await AsyncStorage.multiRemove(sensitiveKeys);
    }
  },
};
