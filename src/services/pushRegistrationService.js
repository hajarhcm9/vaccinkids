import messaging from '@react-native-firebase/messaging';
import { authService } from './authService';
import { mobileLogger } from './mobileLogger';
import { secureDeviceService } from './secureDeviceService';
import { secureTokenService } from './secureTokenService';

async function registerToken(token) {
  if (!token) return false;
  await secureDeviceService.saveMessagingToken(token);
  const accessToken = await secureTokenService.getAccessToken();
  if (!accessToken) return false;
  await authService.registerFcmToken(accessToken, token);
  return true;
}

export const pushRegistrationService = {
  setBackgroundHandler: () => {
    try {
      messaging().setBackgroundMessageHandler(async () => {});
    } catch {
      mobileLogger.warn('push_background_handler_unavailable');
    }
  },

  onForegroundMessage: (handler) => {
    try {
      return messaging().onMessage(handler);
    } catch {
      mobileLogger.warn('push_foreground_handler_unavailable');
      return () => {};
    }
  },

  onNotificationOpened: (handler) => {
    try {
      return messaging().onNotificationOpenedApp(handler);
    } catch {
      mobileLogger.warn('push_open_handler_unavailable');
      return () => {};
    }
  },

  getInitialNotification: async () => {
    try {
      return await messaging().getInitialNotification();
    } catch {
      mobileLogger.warn('push_initial_notification_unavailable');
      return null;
    }
  },

  initialize: async () => {
    try {
      await messaging().registerDeviceForRemoteMessages();
      const authorization = await messaging().requestPermission();
      const enabled =
        authorization === messaging.AuthorizationStatus.AUTHORIZED ||
        authorization === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) return () => {};

      await registerToken(await messaging().getToken());
      return messaging().onTokenRefresh((token) => {
        registerToken(token).catch(() => mobileLogger.warn('push_token_refresh_failed'));
      });
    } catch {
      mobileLogger.warn('push_registration_unavailable');
      return () => {};
    }
  },

  unregister: async () => {
    try {
      const accessToken = await secureTokenService.getAccessToken();
      if (accessToken) await authService.registerFcmToken(accessToken, null);
      await messaging().deleteToken();
    } catch {
      mobileLogger.warn('push_unregister_failed');
    } finally {
      await secureDeviceService.clearMessagingToken();
    }
  },
};
