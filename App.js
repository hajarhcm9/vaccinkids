import React, { useState, useEffect } from 'react';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { colors } from './src/theme';
import { AuthContext } from './src/context/AuthContext';
import { httpClient } from './src/services/httpClient';
import { pushRegistrationService } from './src/services/pushRegistrationService';
import { notificationTarget } from './src/services/notificationNavigation';

const navigationRef = createNavigationContainerRef();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  useEffect(
    () =>
      httpClient.onSessionExpired(() => {
        setIsAuthenticated(false);
      }),
    [],
  );

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let unsubscribe = () => {};
    pushRegistrationService.initialize().then((cleanup) => {
      unsubscribe = cleanup;
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const openTarget = (message) => {
      const target = notificationTarget(message?.data);
      if (target && navigationRef.isReady()) navigationRef.navigate(target.screen, target.params);
    };
    const unsubscribe = pushRegistrationService.onNotificationOpened(openTarget);
    pushRegistrationService.getInitialNotification().then(openTarget).catch(() => {});
    return unsubscribe;
  }, [isAuthenticated]);

  const checkAuthState = async () => {
    try {
      await httpClient.validateSession();
      setIsAuthenticated(true);
    } catch (error) {
      await httpClient.logout().catch(() => {});
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const authContextValue = {
    signIn: () => setIsAuthenticated(true),
    signOut: async () => {
      try {
        await pushRegistrationService.unregister();
      } finally {
        await httpClient.logout();
        setIsAuthenticated(false);
      }
    },
  };

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <NavigationContainer ref={navigationRef}>
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default App;
