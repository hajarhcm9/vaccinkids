import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { colors } from './src/theme';
import { AuthContext } from './src/context/AuthContext';
import { httpClient } from './src/services/httpClient';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      await httpClient.validateSession();
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check error:', error);
      await httpClient.logout().catch(() => {});
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const authContextValue = {
    signIn: () => setIsAuthenticated(true),
    signOut: async () => {
      await httpClient.logout();
      setIsAuthenticated(false);
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
      <NavigationContainer>
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
