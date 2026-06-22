import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { authService, setAuthLogout } from '../services';

export const AuthContext = createContext();

// Android requires a notification channel before any notification can be delivered.
// Create it once at module load time so it's ready before the user logs in.
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('vaccinkids', {
    name: 'VacciKids',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#006FEE',
    showBadge: true,
  });
}

// Request permission and return the raw device push token (FCM on Android,
// APNs on iOS). Returns null if permission is denied or on emulators.
async function getDeviceToken() {
  const { status: current } = await Notifications.getPermissionsAsync();
  const finalStatus = current === 'granted'
    ? current
    : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') return null;
  const { data } = await Notifications.getDevicePushTokenAsync();
  return data || null;
}

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Best-effort: get the device FCM token and register it with the backend.
  // Called after every successful login/session restore. Errors are silenced
  // so a failed push setup never blocks the user.
  const syncPushToken = useCallback(() => {
    getDeviceToken()
      .then((fcmToken) => {
        if (fcmToken) authService.updateFcmToken(fcmToken).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const login = async (token, userData, refreshToken) => {
    setUserToken(token);
    setUser(userData);
    await AsyncStorage.setItem('jwtToken', token);
    if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
    if (userData) await AsyncStorage.setItem('userData', JSON.stringify(userData));
    // Register push token after the JWT is stored so apiClient can authenticate
    syncPushToken();
  };

  // useCallback with empty deps: state setters (setUserToken, setUser) are
  // guaranteed stable by React, so the function reference never changes.
  // This allows apiClient to hold a stable reference for mid-session logouts.
  const logout = useCallback(async () => {
    // Both calls need the JWT still in AsyncStorage — run them before clearing it
    try {
      await Promise.all([authService.logout(), authService.removeFcmToken()]);
    } catch (e) {
      // silencieux
    }
    setUserToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(['jwtToken', 'refreshToken', 'userData']);
  }, []);

  // Register logout with apiClient so it can clear AuthContext state when a
  // token refresh fails mid-session (not just AsyncStorage).
  useEffect(() => {
    setAuthLogout(logout);
    return () => setAuthLogout(null);
  }, [logout]);

  const updateUser = async (partial) => {
    const next = { ...user, ...partial };
    setUser(next);
    await AsyncStorage.setItem('userData', JSON.stringify(next));
  };

  const checkLoggedIn = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const storedUserData = await AsyncStorage.getItem('userData');
      if (token) {
        try {
          const resp = await authService.getMe();
          const freshUser = resp?.user;
          setUserToken(token);
          setUser(freshUser);
          if (freshUser) await AsyncStorage.setItem('userData', JSON.stringify(freshUser));
          // Re-register push token on each app open (token may have rotated)
          syncPushToken();
        } catch (e) {
          if (e?.isAuth || e?.status === 401) {
            await AsyncStorage.multiRemove(['jwtToken', 'refreshToken', 'userData']);
          } else {
            setUserToken(token);
            if (storedUserData) setUser(JSON.parse(storedUserData));
          }
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('[AuthContext] Erreur lecture token/data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { checkLoggedIn(); }, []);

  return (
    <AuthContext.Provider value={{ userToken, isLoading, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
